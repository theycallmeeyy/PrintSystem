import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PRIVACY_POLICY_VERSION } from '../../privacyPolicy';
import { formatClientLocalDateTime, toClientLocalIsoTimestamp } from '../utils/clientDateTime';

export default function PrivacyConsentModal({ onCancel, onAgree }) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [clientNow, setClientNow] = useState(() => new Date());
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClientNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clientDateTime = formatClientLocalDateTime(clientNow);
  const liveConsentTimestamp = toClientLocalIsoTimestamp(clientNow);

  const handleAgree = () => {
    if (!hasAgreed) return;
    onAgree({
      accepted: true,
      version: PRIVACY_POLICY_VERSION,
      acceptedAt: toClientLocalIsoTimestamp(new Date()),
      marketingOptIn
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="privacy-consent-title"
      aria-describedby="privacy-consent-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-8">
        {isPolicyOpen ? (
          <>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setIsPolicyOpen(false)}
                aria-label="Back to consent"
                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 id="privacy-consent-title" className="text-xl font-extrabold tracking-tight text-slate-900">
                  build3x Privacy Policy
                </h2>
                <p id="privacy-consent-description" className="mt-1 text-sm text-slate-500">
                  Version {PRIVACY_POLICY_VERSION} · Dates and times use your device's local time zone.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900 sm:grid-cols-2">
              <p><strong>Effective Date:</strong> {clientDateTime}</p>
              <p><strong>Last Updated:</strong> {clientDateTime}</p>
            </div>

            <div className="mt-5 max-h-[58vh] space-y-5 overflow-y-auto overscroll-contain pr-2 text-sm leading-6 text-slate-600">
              <section>
                <h3 className="font-bold text-slate-900">1. Overview and commitment</h3>
                <p>
                  build3x is responsible for personal information submitted through the build3x print-ordering system. This policy explains how build3x collects, uses, stores, and discloses personal information in accordance with Republic Act No. 10173, the Data Privacy Act of 2012, its Implementing Rules and Regulations, and applicable National Privacy Commission (NPC) issuances. build3x follows the principles of transparency, legitimate purpose, and proportionality.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">2. Information collected</h3>
                <p>build3x collects only information relevant to handling a print request, which may include:</p>
                <ul className="ml-5 mt-2 list-disc space-y-1">
                  <li>Contact details such as your name, phone number, and email address.</li>
                  <li>Order details, including print service, specifications, quantity, preferences, notes, price, payment method, and order status.</li>
                  <li>Delivery address, only when you request delivery.</li>
                  <li>Documents and images you upload, including personal information contained in those files.</li>
                  <li>Consent records, including the policy version, your local acceptance timestamp, and your separate marketing choice.</li>
                  <li>Limited technical information generated to operate and protect the service.</li>
                </ul>
                <p className="mt-2">
                  Information is collected directly from you. Provide only details needed for your order. Do not upload sensitive personal information or another person's information unless it is necessary and you are authorized to provide it. The system records a payment method and order status; it does not request payment-card credentials.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">3. Purposes and lawful basis</h3>
                <p>
                  build3x processes information to receive and price your request, prepare and print your files, coordinate pickup or requested delivery, contact you about the order, provide order tracking and support, maintain business records, and protect the service from misuse. Processing is based on your required consent for this order and, where applicable, steps necessary to provide the service you request or comply with legal obligations.
                </p>
                <p className="mt-2">
                  Promotional emails and marketing updates are a separate, optional purpose. They are sent only if you separately opt in. Marketing consent is not required to place an order and may be withdrawn by contacting the Data Protection Officer.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">4. Data sharing</h3>
                <p>
                  build3x does not sell personal information. Information may be accessed by authorized print-shop personnel who need it to process your order and                   by hosting or infrastructure providers used to operate the service, including Render and Vercel when the system is deployed there. The system also requests font files from Google Fonts; those requests may disclose ordinary connection information to Google, but do not send your order details or uploaded documents. Information may also be disclosed when required by law or to protect the rights, safety, and security of users and build3x.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">5. Storage, security, and retention</h3>
                <p>
                  Order records and uploaded files are stored in the build3x application's configured server storage. Staff order-management functions require staff authentication, and public order tracking is designed to limit displayed customer details. Uploaded files are served through file URLs; anyone who obtains a direct file URL may be able to retrieve that file. Treat file URLs as confidential and upload only materials needed for printing.
                </p>
                <p className="mt-2">
                  build3x uses reasonable safeguards appropriate to the information and service. No method of transmission or storage is completely secure. The current system does not automatically purge order records or uploaded files. build3x must retain information only as long as necessary for order fulfillment, legitimate business records, dispute handling, or legal obligations, and must securely delete or anonymize it when no longer needed. The specific operational retention schedule should be confirmed with the Data Protection Officer.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">6. Your rights as a data subject</h3>
                <p>Subject to the conditions and exceptions in the Data Privacy Act, you may exercise these rights:</p>
                <ol className="ml-5 mt-2 list-decimal space-y-1">
                  <li><strong>Be informed</strong> about the collection and processing of your personal information.</li>
                  <li><strong>Access</strong> your personal information and details about its processing.</li>
                  <li><strong>Object</strong> to processing, including processing for direct marketing.</li>
                  <li><strong>Erasure or blocking</strong> of information when legally allowed.</li>
                  <li><strong>Damages</strong> for harm resulting from inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of information, as provided by law.</li>
                  <li><strong>File a complaint</strong> with the NPC if you believe your privacy rights were violated.</li>
                  <li><strong>Rectification</strong> of inaccurate or incomplete personal information.</li>
                  <li><strong>Data portability</strong> for eligible information in a commonly used electronic or structured format.</li>
                </ol>
                <p className="mt-2">
                  You may also withdraw consent, subject to legal limits. Withdrawal does not affect processing already carried out lawfully, and may prevent build3x from completing an order that requires the information.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">7. Contact and complaints</h3>
                <p>
                  To ask questions, exercise your rights, withdraw marketing consent, or raise a privacy concern, contact the build3x Data Protection Officer at{' '}
                  <a className="font-semibold text-blue-700 underline" href="mailto:dpo@build3x.com">dpo@build3x.com</a>.
                  You may also contact the National Privacy Commission through its official website at{' '}
                  <a className="font-semibold text-blue-700 underline" href="https://privacy.gov.ph/" target="_blank" rel="noreferrer">privacy.gov.ph</a>.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900">8. Policy updates</h3>
                <p>
                  build3x may revise this policy when its practices or legal requirements change. The Effective Date and Last Updated values above show the current date and time on your device when you view this policy. Material changes will be presented for review where required.
                </p>
              </section>
            </div>

            <button
              type="button"
              onClick={() => setIsPolicyOpen(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Back to consent
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 id="privacy-consent-title" className="text-xl font-extrabold tracking-tight text-slate-900">
                  build3x Privacy &amp; Order Consent
                </h2>
                <p id="privacy-consent-description" className="mt-1 text-sm leading-6 text-slate-500">
                  Review the policy and choose your preferences before starting an order. This consent is for clients only.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <p>
                build3x needs your contact details, order specifications, and uploaded files to prepare and fulfill your print order under Republic Act No. 10173.
              </p>
              <button
                type="button"
                onClick={() => setIsPolicyOpen(true)}
                className="mt-2 font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                Read Privacy Policy
              </button>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700">
              <input
                type="checkbox"
                required
                checked={hasAgreed}
                onChange={(event) => setHasAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
              />
              <span>
                <strong className="text-slate-900">Required:</strong> I have read and consent to the build3x Privacy Policy and the processing of my information for this order under RA 10173.
              </span>
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
              />
              <span>
                <strong className="text-slate-900">Optional:</strong> I agree to receive promotional emails and marketing updates from build3x. This is not required to order and I may withdraw my consent.
              </span>
            </label>

            <div
              aria-live="polite"
              className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900"
            >
              <p className="font-semibold">Client local time · recorded when you agree</p>
              <p className="mt-1 break-all font-mono">{liveConsentTimestamp}</p>
              <p className="mt-1 text-blue-700">{clientDateTime}</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Not now
              </button>
              <button
                type="button"
                disabled={!hasAgreed}
                onClick={handleAgree}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                Agree &amp; continue to order
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
