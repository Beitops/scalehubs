/**
 * Convertir la plataforma de la base de datos a un nombre legible
 * @param platform - La plataforma de la base de datos
 * @returns El nombre legible de la plataforma
 */
export const platformConverter = (platform: string) => {
  switch (platform) {
    case 'fb':
      return 'Facebook'
    case 'ig':
      return 'Instagram'
    case 'x':
      return 'X'
    case 'tiktok':
      return 'TikTok'
    case 'callbell':
      return 'CallBell'
  }
}