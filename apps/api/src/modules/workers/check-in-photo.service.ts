import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

/**
 * Upload des photos de pointage vers Cloudinary (audit).
 *
 * La photo est optionnelle : si les variables d'environnement CLOUDINARY_*
 * ne sont pas configurées, l'upload est silencieusement ignoré et le pointage
 * réussit quand même (la photo ne bloque JAMAIS le pointage).
 *
 * Expiration : les assets sont automatiquement supprimés de Cloudinary au
 * bout de 28 jours via le paramètre `expires_at` de l'Upload API.
 */
@Injectable()
export class CheckInPhotoService implements OnModuleInit {
  private readonly logger = new Logger(CheckInPhotoService.name);

  /** Durée de conservation de la photo d'audit (28 jours, en secondes). */
  private static readonly RETENTION_SECONDS = 28 * 24 * 60 * 60;

  private configured = false;

  onModuleInit() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        "Cloudinary non configuré (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET manquants) — les photos de pointage ne seront pas uploadées.",
      );
      this.configured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
    this.logger.log("Cloudinary configuré pour l'upload des photos de pointage.");
  }

  /** Cloudinary est-il configuré (env vars présentes) ? */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload la photo de pointage (base64 data URL) vers Cloudinary.
   * Retourne l'URL sécurisée + la date d'expiration (28 jours), ou null si
   * Cloudinary n'est pas configuré / l'upload échoue (jamais bloquant).
   */
  async uploadCheckInPhoto(
    base64Image: string,
    employeeNumber: string,
  ): Promise<{ url: string; expiresAt: Date } | null> {
    if (!this.configured || !base64Image) return null;

    const expiresAt = new Date(Date.now() + CheckInPhotoService.RETENTION_SECONDS * 1000);
    const expiresAtSec = Math.floor(expiresAt.getTime() / 1000);

    try {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "shop-attendance/check-in-photos",
        public_id: `checkin-${employeeNumber}-${Date.now()}`,
        resource_type: "image",
        // Expiration automatique : Cloudinary supprime l'asset après 28 jours.
        expires_at: expiresAtSec,
        // Mémorisé aussi en contexte : l'API Admin ne renvoie pas expires_at,
        // le cron de purge s'appuie sur ce champ pour identifier les assets
        // dont l'expiration a été dépassée.
        context: { custom: { expires_at: String(expiresAtSec) } },
        tags: ["check-in-audit"],
      });

      if (!result?.secure_url) {
        this.logger.warn("Upload Cloudinary: réponse sans secure_url, photo ignorée.");
        return null;
      }

      return { url: result.secure_url, expiresAt };
    } catch (err: any) {
      // L'audit photo ne doit jamais faire échouer le pointage.
      this.logger.error(`Upload Cloudinary échoué (photo ignorée): ${err?.message ?? err}`);
      return null;
    }
  }
}
