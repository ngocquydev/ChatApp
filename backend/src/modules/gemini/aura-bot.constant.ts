import { Types } from 'mongoose';

export const AURA_BOT_ID = '666666666666666666666666';

export const AURA_BOT_USER = {
  _id: new Types.ObjectId(AURA_BOT_ID),
  name: 'Aura AI',
  email: 'aura.bot@chatapp.internal',
  role: 'bot',
  avatar: '/assets/avatars/aura-bot.png',
  bio: 'Trợ lý AI thông minh tích hợp Google Gemini Flash (@aura)',
  isDeleted: false,
  isBan: false,
};

