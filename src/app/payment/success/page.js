import { redirect } from 'next/navigation';

/* Stripe Checkout returns to /home?checkout=success (create-checkout-session
   success_url); this older URL was unreachable and claimed a 7-day trial.
   Anyone who still lands here goes to the same place (QA RET-18). */
export default function PaymentSuccessPage() {
  redirect('/home?checkout=success');
}
