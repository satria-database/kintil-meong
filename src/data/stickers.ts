import stickerMain from '../assets/stickers/sticker_meong_main.jpg';
import stickerLove from '../assets/stickers/sticker_meong_love.jpg';
import stickerThumbsup from '../assets/stickers/sticker_meong_thumbsup.jpg';
import stickerSecret from '../assets/stickers/sticker_meong_secret.jpg';

export interface StickerItem {
  id: string;
  name: string;
  label: string;
  src: string;
}

export const KINTIL_MEONG_STICKERS: StickerItem[] = [
  {
    id: 'meong-logo',
    name: 'Kintil Meong Badge',
    label: 'Meong Asli',
    src: stickerMain,
  },
  {
    id: 'meong-love',
    name: 'Kintil Meong Love',
    label: 'Cayang ❤️',
    src: stickerLove,
  },
  {
    id: 'meong-thumbsup',
    name: 'Kintil Meong Mantap',
    label: 'Mantap! 👍',
    src: stickerThumbsup,
  },
  {
    id: 'meong-secret',
    name: 'Kintil Meong Spy Lock',
    label: 'Rahasia E2EE 🔒',
    src: stickerSecret,
  },
];
