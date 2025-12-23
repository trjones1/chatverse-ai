// app/chat/page.tsx
import ChatClientPage from '../../components/ChatClientPage';
import { headers } from 'next/headers';
import { getCharacterConfig } from '@/lib/characters.config';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const headersList = await headers();
  const hostname = headersList.get('x-hostname') || 'chatwithlexi.com';
  const characterConfig = getCharacterConfig(hostname);

  return <ChatClientPage characterConfig={characterConfig} />;
}
