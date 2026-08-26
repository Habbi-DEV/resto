<<<<<<< HEAD
import { getCurrentLang, type Lang } from './i18n';

const LABEL: Record<Lang, Record<string, string>> = {
  fr: {
    pending: 'Commande reçue',
    confirmed: 'Confirmée',
    preparing: 'En cuisine',
    ready: 'Prête',
    out_for_delivery: 'En route',
    completed: 'Servie',
  },
  ar: {
    pending: 'تم استلام الطلب',
    confirmed: 'مؤكدة',
    preparing: 'في المطبخ',
    ready: 'جاهزة',
    out_for_delivery: 'في الطريق',
    completed: 'تم التقديم',
  },
};

const HINT: Record<Lang, Record<string, string>> = {
  fr: {
    pending: 'En attente de la confirmation du restaurant…',
    confirmed: 'Votre commande a été acceptée 👍',
    preparing: 'La cuisine s’en occupe 👨‍🍳',
    ready: 'Prête ! Elle arrive à votre table sous peu.',
    out_for_delivery: 'Votre livreur est en route 🛵',
    completed: 'Bon appétit ! 🧡',
  },
  ar: {
    pending: 'بانتظار تأكيد المطعم لطلبك…',
    confirmed: 'تم قبول طلبك 👍',
    preparing: 'المطبخ يعمل عليه 👨‍🍳',
    ready: 'جاهز! سنحضره إلى طاولتك قريباً.',
    out_for_delivery: 'عامل التوصيل في الطريق 🛵',
    completed: 'بالهناء والشفاء! 🧡',
  },
};

// Not React hooks (used from plain render helpers), so they read the
// current language directly rather than via useLang().
export const ORDER_STATUS_LABEL: Record<string, string> = new Proxy({}, {
  get: (_t, key: string) => LABEL[getCurrentLang()][key],
});

export const ORDER_STATUS_HINT: Record<string, string> = new Proxy({}, {
  get: (_t, key: string) => HINT[getCurrentLang()][key],
});
=======
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'In the kitchen',
  ready: 'Ready',
  out_for_delivery: 'On the way',
  completed: 'Served',
};

export const ORDER_STATUS_HINT: Record<string, string> = {
  pending: 'Waiting for the restaurant to confirm your order…',
  confirmed: 'Your order has been accepted 👍',
  preparing: 'The kitchen is on it 👨‍🍳',
  ready: 'Ready! We will bring it to your table shortly.',
  out_for_delivery: 'Your courier is on the way 🛵',
  completed: 'Enjoy your meal! Bon appétit 🧡',
};
>>>>>>> 32a7ccf652c6bac393a9af856a184051d77d71a6
