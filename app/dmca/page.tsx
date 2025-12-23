import Link from "next/link";

export const dynamic = "force-static";

export default function DmcaPage() {
const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "ChatVerse";
const agentEmail = process.env.NEXT_PUBLIC_DMCA_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "dmca@yourbrand.com";
const updated = "August 26, 2025";

return (
<main className="mx-auto max-w-3xl p-6">
<h1 className="text-3xl font-bold mb-3">DMCA & Takedown Policy</h1>
<p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated {updated}</p>

<p className="mb-4">
{brand} respects intellectual property rights and expects users to do the same. If you believe that content available on our
service infringes your copyright, please submit a notice as described below. This page is provided for convenience and does not
constitute legal advice.
</p>

<h2 className="text-xl font-semibold mt-8 mb-2">How to submit a DMCA notice</h2>
<p className="mb-3">Your written notice must include all of the following:</p>
<ul className="list-disc pl-6 space-y-2">
<li>Your full name, address, telephone number, and email address.</li>
<li>A description of the copyrighted work you claim has been infringed.</li>
<li>The URL or exact location of the allegedly infringing material on our service.</li>
<li>A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
<li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf.</li>
<li>Your physical or electronic signature.</li>
</ul>

<p className="mt-4">
Send your notice to our designated agent at {" "}
<a href={`mailto:${agentEmail}`} className="underline">{agentEmail}</a>.
</p>

<h2 className="text-xl font-semibold mt-8 mb-2">Counter-notification</h2>
<p className="mb-3">
If your content was removed due to a DMCA notice and you believe the removal was a mistake or misidentification, you may submit a
counter-notice that includes: your contact information, identification of the removed material and its location before removal,
a statement under penalty of perjury that you have a good faith belief the material was removed as a result of mistake or
misidentification, your consent to the jurisdiction of your local federal court, and your signature. Send counter-notices to the
same designated agent above.
</p>

<h2 className="text-xl font-semibold mt-8 mb-2">Repeat infringer policy</h2>
<p>
In appropriate circumstances, {brand} may terminate accounts of users who are determined to be repeat infringers.
</p>

<p className="mt-8 text-sm text-gray-600 dark:text-gray-300">
For more information, please also review our {" "}
<Link href="/terms" className="underline">Terms</Link> and {" "}
<Link href="/privacy" className="underline">Privacy Policy</Link>.
</p>
</main>
);
}
