// lib/translations.ts - Simple translation strings

import { SupportedLanguage } from './localization';

export const translations: Record<SupportedLanguage, {
  // Common UI
  loading: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  close: string;
  save: string;

  // Pricing & Purchase
  purchase: string;
  buyNow: string;
  getStarted: string;
  unlockPremium: string;
  upgrade: string;
  mostPopular: string;
  bestValue: string;
  limitedTime: string;

  // Messages & Chat
  sendMessage: string;
  typeMessage: string;
  messageLimitReached: string;
  upgradeToUnlock: string;
  voiceMessagesIncluded: string;

  // Authentication
  signIn: string;
  signUp: string;
  signOut: string;
  createAccount: string;
  continueWithGoogle: string;
  continueWithEmail: string;

  // Features
  unlimitedMessages: string;
  voiceMessages: string;
  exclusiveContent: string;
  characterAccess: string;

  // Call to Action
  tryItFree: string;
  startChatting: string;
  talkToCharacter: string;
  exploreCharacters: string;
}> = {
  en: {
    // Common UI
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',

    // Pricing & Purchase
    purchase: 'Purchase',
    buyNow: 'Buy Now',
    getStarted: 'Get Started',
    unlockPremium: 'Unlock Premium',
    upgrade: 'Upgrade',
    mostPopular: 'Most Popular',
    bestValue: 'Best Value',
    limitedTime: 'Limited Time',

    // Messages & Chat
    sendMessage: 'Send Message',
    typeMessage: 'Type your message...',
    messageLimitReached: 'Message limit reached',
    upgradeToUnlock: 'Upgrade to continue chatting',
    voiceMessagesIncluded: 'Voice messages included',

    // Authentication
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    createAccount: 'Create Account',
    continueWithGoogle: 'Continue with Google',
    continueWithEmail: 'Continue with Email',

    // Features
    unlimitedMessages: 'Unlimited Messages',
    voiceMessages: 'Voice Messages',
    exclusiveContent: 'Exclusive Content',
    characterAccess: 'All Character Access',

    // Call to Action
    tryItFree: 'Try it Free',
    startChatting: 'Start Chatting',
    talkToCharacter: 'Talk to {character}',
    exploreCharacters: 'Explore Characters',
  },

  es: {
    // Common UI
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Cerrar',
    save: 'Guardar',

    // Pricing & Purchase
    purchase: 'Comprar',
    buyNow: 'Comprar Ahora',
    getStarted: 'Comenzar',
    unlockPremium: 'Desbloquear Premium',
    upgrade: 'Mejorar',
    mostPopular: 'Más Popular',
    bestValue: 'Mejor Valor',
    limitedTime: 'Tiempo Limitado',

    // Messages & Chat
    sendMessage: 'Enviar Mensaje',
    typeMessage: 'Escribe tu mensaje...',
    messageLimitReached: 'Límite de mensajes alcanzado',
    upgradeToUnlock: 'Mejora para continuar chateando',
    voiceMessagesIncluded: 'Mensajes de voz incluidos',

    // Authentication
    signIn: 'Iniciar Sesión',
    signUp: 'Registrarse',
    signOut: 'Cerrar Sesión',
    createAccount: 'Crear Cuenta',
    continueWithGoogle: 'Continuar con Google',
    continueWithEmail: 'Continuar con Email',

    // Features
    unlimitedMessages: 'Mensajes Ilimitados',
    voiceMessages: 'Mensajes de Voz',
    exclusiveContent: 'Contenido Exclusivo',
    characterAccess: 'Acceso a Todos los Personajes',

    // Call to Action
    tryItFree: 'Pruébalo Gratis',
    startChatting: 'Comenzar a Chatear',
    talkToCharacter: 'Habla con {character}',
    exploreCharacters: 'Explorar Personajes',
  },

  pt: {
    // Common UI
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Fechar',
    save: 'Salvar',

    // Pricing & Purchase
    purchase: 'Comprar',
    buyNow: 'Comprar Agora',
    getStarted: 'Começar',
    unlockPremium: 'Desbloquear Premium',
    upgrade: 'Melhorar',
    mostPopular: 'Mais Popular',
    bestValue: 'Melhor Valor',
    limitedTime: 'Tempo Limitado',

    // Messages & Chat
    sendMessage: 'Enviar Mensagem',
    typeMessage: 'Digite sua mensagem...',
    messageLimitReached: 'Limite de mensagens atingido',
    upgradeToUnlock: 'Atualize para continuar conversando',
    voiceMessagesIncluded: 'Mensagens de voz incluídas',

    // Authentication
    signIn: 'Entrar',
    signUp: 'Cadastrar',
    signOut: 'Sair',
    createAccount: 'Criar Conta',
    continueWithGoogle: 'Continuar com Google',
    continueWithEmail: 'Continuar com Email',

    // Features
    unlimitedMessages: 'Mensagens Ilimitadas',
    voiceMessages: 'Mensagens de Voz',
    exclusiveContent: 'Conteúdo Exclusivo',
    characterAccess: 'Acesso a Todos os Personagens',

    // Call to Action
    tryItFree: 'Experimente Grátis',
    startChatting: 'Começar a Conversar',
    talkToCharacter: 'Fale com {character}',
    exploreCharacters: 'Explorar Personagens',
  },

  fr: {
    // Common UI
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    save: 'Enregistrer',

    // Pricing & Purchase
    purchase: 'Acheter',
    buyNow: 'Acheter Maintenant',
    getStarted: 'Commencer',
    unlockPremium: 'Débloquer Premium',
    upgrade: 'Améliorer',
    mostPopular: 'Plus Populaire',
    bestValue: 'Meilleure Valeur',
    limitedTime: 'Temps Limité',

    // Messages & Chat
    sendMessage: 'Envoyer Message',
    typeMessage: 'Tapez votre message...',
    messageLimitReached: 'Limite de messages atteinte',
    upgradeToUnlock: 'Mettez à niveau pour continuer à discuter',
    voiceMessagesIncluded: 'Messages vocaux inclus',

    // Authentication
    signIn: 'Se Connecter',
    signUp: "S'inscrire",
    signOut: 'Se Déconnecter',
    createAccount: 'Créer un Compte',
    continueWithGoogle: 'Continuer avec Google',
    continueWithEmail: 'Continuer avec Email',

    // Features
    unlimitedMessages: 'Messages Illimités',
    voiceMessages: 'Messages Vocaux',
    exclusiveContent: 'Contenu Exclusif',
    characterAccess: 'Accès à Tous les Personnages',

    // Call to Action
    tryItFree: 'Essayez Gratuitement',
    startChatting: 'Commencer à Discuter',
    talkToCharacter: 'Parler à {character}',
    exploreCharacters: 'Explorer les Personnages',
  },
};

/**
 * Get translation for a key
 */
export function t(key: keyof typeof translations['en'], language: SupportedLanguage = 'en', replacements?: Record<string, string>): string {
  let text = translations[language][key] || translations['en'][key];

  // Replace placeholders like {character}
  if (replacements) {
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(`{${placeholder}}`, value);
    });
  }

  return text;
}
