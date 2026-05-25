// /home/project/services/zipService.ts
// Service de création de fichier ZIP pour les bulletins générés en série
// Utilise expo-file-system (mobile) + JSZip (création ZIP) + expo-sharing (partage)

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import JSZip from 'jszip';

export interface ZipResult {
  uri: string;
  name: string;
  fileCount: number;
}

/**
 * Crée un vrai fichier ZIP contenant plusieurs fichiers PDF
 * Compatible mobile (via expo-file-system) et web (via fetch)
 */
export async function createZipFromFiles(
  files: { uri: string; name: string }[],
  zipName: string
): Promise<ZipResult | null> {
  if (files.length === 0) {
    console.error('Aucun fichier à compresser');
    return null;
  }

  try {
    const zip = new JSZip();
    
    // Ajouter chaque fichier au ZIP
    for (const file of files) {
      let fileContent: string | ArrayBuffer;
      
      if (Platform.OS === 'web') {
        // Web : l'URI est une URL blob ou data URL
        const response = await fetch(file.uri);
        fileContent = await response.arrayBuffer();
      } else {
        // Mobile : lire le fichier depuis le système de fichiers
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileContent = base64;
      }
      
      // Ajouter le fichier au ZIP
      // Si le contenu est en base64, JSZip a besoin de l'option { base64: true }
      if (typeof fileContent === 'string' && Platform.OS !== 'web') {
        zip.file(file.name, fileContent, { base64: true });
      } else {
        zip.file(file.name, fileContent);
      }
    }
    
    // Générer le ZIP
    const zipContent = await zip.generateAsync({ type: 'blob' });
    
    let zipUri: string;
    
    if (Platform.OS === 'web') {
      // Web : créer une URL blob
      zipUri = URL.createObjectURL(zipContent);
    } else {
      // Mobile : sauvegarder le fichier dans le système
      const zipPath = FileSystem.documentDirectory + zipName;
      const base64 = await blobToBase64(zipContent);
      await FileSystem.writeAsStringAsync(zipPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zipUri = zipPath;
    }
    
    return {
      uri: zipUri,
      name: zipName,
      fileCount: files.length,
    };
  } catch (error) {
    console.error('Erreur création ZIP:', error);
    return null;
  }
}

/**
 * Convertit un Blob en Base64 (utilisé pour mobile)
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Partage un fichier ZIP avec l'utilisateur
 * - Web : déclenche le téléchargement
 * - Mobile : ouvre le panneau de partage
 */
export async function shareZip(zipUri: string, zipName: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // Web : déclencher le téléchargement automatique
      const link = document.createElement('a');
      link.href = zipUri;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Nettoyer l'URL après le téléchargement
      setTimeout(() => URL.revokeObjectURL(zipUri), 1000);
      return true;
    } else {
      // Mobile : partager via expo-sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(zipUri);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('Erreur partage ZIP:', error);
    return false;
  }
}

/**
 * Nettoie les fichiers temporaires (mobile)
 */
export async function cleanupTempFiles(tempDir: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const dirInfo = await FileSystem.getInfoAsync(tempDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      }
    } catch (error) {
      console.error('Erreur nettoyage fichiers temporaires:', error);
    }
  }
}