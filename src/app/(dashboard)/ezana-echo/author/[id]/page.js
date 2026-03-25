import { redirect } from 'next/navigation';

/** Legacy author URLs — consolidated into Ezana Echo hub for now */
export default function EzanaEchoAuthorRedirect() {
  redirect('/ezana-echo');
}
