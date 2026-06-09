export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 text-gray-300">
      <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
      <p>Local preview mode stores reports and credit simulations in the browser. Cloud mode will store user accounts, reports, credit ledger entries, and audit records in the configured database.</p>
      <p>Production deployment should include data export, deletion, retention, and processor disclosures before launch.</p>
    </article>
  );
}
