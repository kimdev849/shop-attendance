import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { v2 as cloudinary } from "cloudinary";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Filet de sécurité pour la rétention à 28 jours des photos de pointage.
 *
 * Cloudinary est censé supprimer automatiquement les assets dont
 * `expires_at` est dépassé, mais ce comportement n'est pas garanti sur tous
 * les plans. Ce cron quotidien supprime donc explicitement :
 *   1. les assets Cloudinary taggés "check-in-audit" dont `expires_at`
 *      (contexte d'upload) est dépassé ;
 *   2. les lignes Attendance dont checkInPhotoExpiresAt est dépassé
 *      (vidage des champs checkInPhotoUrl / checkInPhotoExpiresAt en base).
 *
 * Inoffensif si Cloudinary n'est pas configuré : il ne fait rien (les uploads
 * sont de toute façon désactivés dans ce cas).
 */
@Injectable()
export class CheckInPhotoCleanupService {
  private readonly logger = new Logger(CheckInPhotoCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Cron quotidien à 4h30 du matin (heure serveur). */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: "check-in-photo-cleanup" })
  async handleCleanup() {
    try {
      await this.cleanupExpiredDbRecords();
      await this.cleanupExpiredCloudinaryAssets();
    } catch (err) {
      this.logger.error(`Purge des photos de pointage échouée: ${err}`);
    }
  }

  /**
   * Vide checkInPhotoUrl / checkInPhotoExpiresAt sur les pointages dont la
   * photo a expiré (l'asset Cloudinary est supprimé séparément par expires_at,
   * et le dashboard affiche déjà "Photo expirée" pour ces lignes).
   */
  async cleanupExpiredDbRecords() {
    const expired = await this.prisma.attendance.updateMany({
      where: {
        checkInPhotoUrl: { not: null },
        checkInPhotoExpiresAt: { lt: new Date() },
      },
      data: { checkInPhotoUrl: null, checkInPhotoExpiresAt: null },
    });
    if (expired.count > 0) {
      this.logger.log(`Purge base: ${expired.count} photo(s) de pointage expirée(s) nettoyée(s).`);
    }
  }

  /**
   * Supprime côté Cloudinary les assets du dossier d'audit dont expires_at
   * est dépassé. Best-effort : en cas d'échec, le cron du lendemain réessaie.
   */
  async cleanupExpiredCloudinaryAssets() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return; // Cloudinary non configuré : rien à purger

    const nowSec = Math.floor(Date.now() / 1000);
    const deleted: string[] = [];

    try {
      // Liste les assets taggés "check-in-audit" dont expires_at est dépassé.
      // L'API Admin ne permet pas de filtrer directement sur expires_at, on
      // récupère donc par lots et on filtre côté application.
      let nextCursor: string | undefined = undefined;
      do {
        const list: any = await cloudinary.api.resources_by_tag("check-in-audit", {
          max_results: 100,
          next_cursor: nextCursor,
          context: true,
        });

        for (const resource of list?.resources ?? []) {
          const expiresAt = resource?.context?.custom?.expires_at;
          if (expiresAt && Number(expiresAt) <= nowSec) {
            try {
              await cloudinary.uploader.destroy(resource.public_id, { resource_type: "image" });
              deleted.push(resource.public_id);
            } catch (err) {
              this.logger.warn(`Suppression Cloudinary impossible pour ${resource.public_id}: ${err}`);
            }
          }
        }

        nextCursor = list?.next_cursor;
      } while (nextCursor);

      if (deleted.length > 0) {
        this.logger.log(`Purge Cloudinary: ${deleted.length} photo(s) expirée(s) supprimée(s).`);
      }
    } catch (err) {
      this.logger.warn(`Listage/suppression Cloudinary échoué (réessai demain): ${err}`);
    }
  }
}
