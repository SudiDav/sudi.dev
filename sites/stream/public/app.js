const copy = {
  en: {
    skip: 'Skip to content',
    navSetup: 'Family setup',
    navDevices: 'Devices',
    heroTitle: 'Movie night at home',
    heroCopy: 'Find a film for tonight and open Stremio on your screen.',
    openStremio: 'Open Stremio Web',
    setupCopy: 'Ask Sudi which Stremio account or profile to use on your device.',
    requestAccess: 'Request access',
    devicesTitle: 'Choose your device',
    devicesCopy: 'Find the official app for your screen.',
    helpTitle: 'Watching with Stremio',
    profileTitle: 'Can I use a family profile?',
    profileCopy: 'Stremio Supporter plans offer household profiles. Ask Sudi to set up your profile on a supported device.',
    profileLink: 'About Stremio profiles',
    signInTitle: 'Where do I sign in?',
    signInCopy: 'Sign in directly in Stremio Web or the official app. For family access, ask Sudi which account or profile to use.',
    linkDeviceTitle: 'How do I link a TV?',
    linkDeviceCopy: 'If your TV shows a Stremio code, use the official linking page. For Sudi’s account, ask Sudi to approve the device.',
    linkDeviceAction: 'Open Stremio Link',
    availabilityTitle: 'Which movies can I play?',
    availabilityCopy: 'Stremio lists sources provided by your add-ons and services. Movie picks here are recommendations. Use sources you have permission to watch.',
    footer: 'Made for friends and family. Cookie-free visit statistics by Cloudflare.',
    inviteCopy: 'Email Sudi to ask about family access. Your email app will open a draft for you to send.',
    contactAction: 'Email Sudi',
    close: 'Close',
    emailSubject: 'Sudi Stream access',
    emailBody: 'Hi Sudi, I would like access to the family Stremio setup.',
    navigationLabel: 'Main navigation',
    languageLabel: 'Language',
    homeLabel: 'Sudi Stream home',
    pageTitle: 'Sudi Stream — Family movie nights',
  },
  fr: {
    skip: 'Aller au contenu',
    navSetup: 'Accès famille',
    navDevices: 'Appareils',
    heroTitle: 'Soirées cinéma en famille',
    heroCopy: 'Trouvez un film pour ce soir et ouvrez Stremio sur votre écran.',
    openStremio: 'Ouvrir Stremio Web',
    setupCopy: 'Demandez à Sudi quel compte ou profil Stremio utiliser sur votre appareil.',
    requestAccess: 'Demander un accès',
    devicesTitle: 'Choisissez votre appareil',
    devicesCopy: 'Trouvez l’application officielle pour votre écran.',
    helpTitle: 'Regarder avec Stremio',
    profileTitle: 'Puis-je utiliser un profil familial ?',
    profileCopy: 'Les offres Stremio Supporter proposent des profils pour le foyer. Demandez à Sudi de créer votre profil sur un appareil compatible.',
    profileLink: 'À propos des profils Stremio',
    signInTitle: 'Où puis-je me connecter ?',
    signInCopy: 'Connectez-vous directement dans Stremio Web ou dans l’application officielle. Pour l’accès famille, demandez à Sudi quel compte ou profil utiliser.',
    linkDeviceTitle: 'Comment associer une télévision ?',
    linkDeviceCopy: 'Si votre télévision affiche un code Stremio, utilisez la page officielle. Pour utiliser le compte de Sudi, demandez-lui d’autoriser cet appareil.',
    linkDeviceAction: 'Ouvrir Stremio Link',
    availabilityTitle: 'Quels films puis-je regarder ?',
    availabilityCopy: 'Stremio affiche les sources proposées par vos extensions et services. Les films présentés ici sont des suggestions. Utilisez les sources que vous avez le droit de regarder.',
    footer: 'Créé pour nos amis et notre famille. Statistiques de visites sans cookies par Cloudflare.',
    inviteCopy: 'Écrivez à Sudi pour demander un accès famille. Votre messagerie ouvrira un brouillon que vous pourrez envoyer.',
    contactAction: 'Écrire à Sudi',
    close: 'Fermer',
    emailSubject: 'Accès Sudi Stream',
    emailBody: 'Bonjour Sudi, je souhaiterais accéder à la configuration familiale de Stremio.',
    navigationLabel: 'Navigation principale',
    languageLabel: 'Langue',
    homeLabel: 'Accueil Sudi Stream',
    pageTitle: 'Sudi Stream — Soirées cinéma en famille',
  },
}

const devices = {
  en: {
    mac: ['On your Mac', 'Install the macOS app for your processor and sign in to Stremio.', 'Get Stremio for Mac'],
    windows: ['On your Windows PC', 'Install the Windows app and sign in to Stremio.', 'Get Stremio for Windows'],
    android: ['On your Android device', 'Choose the Android Mobile app for phones and tablets, or Android TV for a television.', 'Get Stremio for Android'],
    ios: ['On your iPhone or iPad', 'Check the official downloads page for available apps and web playback options.', 'See iPhone and iPad options'],
    tv: ['On your television', 'Choose your TV platform. App availability depends on the model and platform.', 'See TV options'],
  },
  fr: {
    mac: ['Sur votre Mac', 'Installez l’application macOS adaptée à votre processeur et connectez-vous à Stremio.', 'Obtenir Stremio pour Mac'],
    windows: ['Sur votre PC Windows', 'Installez l’application Windows et connectez-vous à Stremio.', 'Obtenir Stremio pour Windows'],
    android: ['Sur votre appareil Android', 'Choisissez Android Mobile pour un téléphone ou une tablette, ou Android TV pour un téléviseur.', 'Obtenir Stremio pour Android'],
    ios: ['Sur votre iPhone ou iPad', 'Consultez la page officielle pour connaître les applications et les options de lecture sur le web.', 'Voir les options iPhone et iPad'],
    tv: ['Sur votre télévision', 'Choisissez la plateforme de votre téléviseur. La disponibilité dépend du modèle et de la plateforme.', 'Voir les options TV'],
  },
}

const languageButtons = document.querySelectorAll('[data-lang]')
const deviceButtons = document.querySelectorAll('[data-device]')
const inviteDialog = document.querySelector('#invite-dialog')
let language = 'en'
let device = 'mac'

function renderDevice() {
  const [title, description, link] = devices[language][device]
  document.querySelector('#device-title').textContent = title
  document.querySelector('#device-copy').textContent = description
  document.querySelector('#device-link').textContent = link
}

function setLanguage(next) {
  language = next
  const labels = copy[next]
  document.documentElement.lang = next
  document.title = labels.pageTitle
  document.querySelector('nav').setAttribute('aria-label', labels.navigationLabel)
  document.querySelector('.language').setAttribute('aria-label', labels.languageLabel)
  document.querySelector('.device-tabs').setAttribute('aria-label', labels.devicesTitle)
  document.querySelector('header .brand').setAttribute('aria-label', labels.homeLabel)
  document.querySelector('#contact-link').href =
    'mailto:contact@sudi.dev?subject=' + encodeURIComponent(labels.emailSubject) +
    '&body=' + encodeURIComponent(labels.emailBody)
  document.querySelectorAll('[data-t]').forEach(el => {
    el.textContent = labels[el.dataset.t]
  })
  languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === next)))
  renderDevice()
  try { localStorage.setItem('sudi-stream-language', next) } catch {}
}

languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)))
deviceButtons.forEach(button => button.addEventListener('click', () => {
  device = button.dataset.device
  deviceButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
  renderDevice()
}))

document.querySelector('[data-invite]').addEventListener('click', () => inviteDialog.showModal())
document.querySelector('[data-close]').addEventListener('click', () => inviteDialog.close())
inviteDialog.addEventListener('click', event => {
  if (event.target !== inviteDialog) return
  const bounds = inviteDialog.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) inviteDialog.close()
})

try {
  if (localStorage.getItem('sudi-stream-language') === 'fr') language = 'fr'
} catch {}
setLanguage(language)
