import React from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  ShieldCheck
} from 'lucide-react';

export default function HomePage({ onPrintNow }) {
  return (
    <div className="flex flex-1 flex-col bg-[#f3f7ff] text-[#12234e]">
      <section className="mx-auto flex w-full max-w-[1120px] flex-1 items-center px-5 py-12 sm:px-8 sm:py-16 lg:px-0 lg:py-20">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <section className="max-w-[550px]">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-blue-700">
              <span className="h-0.5 w-5 bg-blue-600" />
              Fast. Simple. Ready when you are.
            </p>
            <h1 className="text-[clamp(2.8rem,6.2vw,4.35rem)] font-medium leading-[1.02] tracking-[-0.075em] text-[#10234f]">
              Your Prints,
              <span className="block text-blue-600">Just a Click Away.</span>
            </h1>
            <p className="mt-6 max-w-[490px] text-base leading-7 text-slate-500 sm:text-[17px]">
              Upload your documents, choose your printing preferences, and schedule your pickup with ease.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={onPrintNow}
                className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Print Now
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <Check className="h-4 w-4 text-emerald-500" />
                No account needed
              </span>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-blue-100 pt-5 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Secure uploads
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-blue-600" />
                Quick pickup
              </span>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                All common formats
              </span>
            </div>
          </section>

          <div
            aria-label="Print order preview illustration"
            className="relative mx-auto h-[330px] w-full max-w-[440px] sm:h-[390px]"
          >
            <div className="absolute left-[27%] top-[8%] h-[78%] w-[67%] rounded-full bg-blue-600 shadow-[0_28px_55px_rgba(37,99,235,0.2)]" />
            <div className="absolute left-[9%] top-[13%] h-[74%] w-[48%] rotate-[-12deg] rounded-md bg-white shadow-[0_20px_40px_rgba(15,35,80,0.12)]">
              <div className="absolute left-[18%] top-[25%] h-1.5 w-[62%] rounded-full bg-blue-100" />
              <div className="absolute left-[18%] top-[33%] h-1.5 w-[69%] rounded-full bg-blue-100" />
              <div className="absolute left-[18%] top-[41%] h-1.5 w-[54%] rounded-full bg-blue-100" />
            </div>
            <div className="absolute left-[31%] top-[11%] h-[73%] w-[47%] rotate-[-7deg] rounded-md bg-white shadow-[0_20px_40px_rgba(15,35,80,0.1)]" />
            <div className="absolute left-[33%] top-[15%] flex h-[73%] w-[55%] rotate-[5deg] flex-col rounded-md bg-white p-6 shadow-[0_24px_50px_rgba(15,35,80,0.2)] sm:p-8">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-blue-600">
                <img src="/print-plus-logo.svg" alt="" className="h-4 w-4" />
                PRINTPLUS
              </div>
              <p className="mt-12 text-[clamp(1.2rem,3vw,1.55rem)] font-medium tracking-tight text-[#12234e]">
                Ready to print.
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="h-1 w-full rounded-full bg-slate-200" />
                <div className="h-1 w-full rounded-full bg-slate-200" />
                <div className="h-1 w-2/3 rounded-full bg-slate-200" />
              </div>
              <div className="mt-auto border-t border-blue-100 pt-3 text-[8px] text-slate-400">
                Premium quality
              </div>
            </div>
            <div className="absolute bottom-[1%] right-0 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_16px_38px_rgba(15,35,80,0.18)] sm:right-[-2%]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[11px] font-bold text-slate-800">Order confirmed</span>
                <span className="mt-0.5 block text-[10px] text-slate-500">Ready for pickup at 3:00 PM</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-5 text-[10px] text-slate-400 sm:px-8 lg:px-0">
        <span>Professional printing made effortless.</span>
        <span>Mon–Sat · 8:00 AM–6:00 PM</span>
      </footer>

    </div>
  );
}
