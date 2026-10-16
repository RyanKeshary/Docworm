import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  FileText,
  Shield,
  User,
  Crown,
  Building,
  GraduationCap,
  Send,
  Download,
  X,
  HelpCircle
} from 'lucide-react';
import type { Role, User as UserType } from '../types';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
}

export function OnboardingGuideModal({ isOpen, onClose, currentUser }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem(`docworm_guide_seen_${currentUser.id}`, 'true');
    onClose();
  };

  const role = currentUser.role;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="bg-[#1B365D] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <GraduationCap size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded text-blue-200">
                  Quick Start Guide
                </span>
                <span className="text-xs text-blue-200">Step {currentStep} of {totalSteps}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Welcome to Docworm Portal</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
            title="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-[#1B365D] h-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 flex-1 space-y-6">
          {/* STEP 1: Academic Hierarchy & Your Role */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                  Step 1: Institutional Hierarchy
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  How Approvals Flow at Shree L.R. Tiwari College of Engineering
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Docworm enforces strict institutional governance. Proposals and leave requests move through clear authority checkpoints:
                </p>
              </div>

              {/* Hierarchy Diagram */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className={`p-2.5 rounded-lg border text-xs ${role === 'Faculty' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-white border-slate-200'}`}>
                  <User size={18} className="mx-auto text-slate-600 mb-1" />
                  <span className="font-bold text-slate-900 block">Faculty</span>
                  <span className="text-[10px] text-slate-500 block">Initiates & Drafts</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs ${role === 'HOD' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-white border-slate-200'}`}>
                  <Building size={18} className="mx-auto text-slate-600 mb-1" />
                  <span className="font-bold text-slate-900 block">HOD</span>
                  <span className="text-[10px] text-slate-500 block">Dept Endorsement</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs ${role === 'Dean' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-white border-slate-200'}`}>
                  <Shield size={18} className="mx-auto text-slate-600 mb-1" />
                  <span className="font-bold text-slate-900 block">Dean</span>
                  <span className="text-[10px] text-slate-500 block">Academic Review</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs ${role === 'Principal' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-white border-slate-200'}`}>
                  <Crown size={18} className="mx-auto text-slate-600 mb-1" />
                  <span className="font-bold text-slate-900 block">Principal</span>
                  <span className="text-[10px] text-slate-500 block">Final Sanction</span>
                </div>
              </div>

              {/* Current Role Spotlight */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1B365D] text-white">
                    Your Assigned Role: {role}
                  </span>
                  <span className="text-slate-600 font-medium">({currentUser.name})</span>
                </div>
                <ul className="space-y-1.5 text-slate-700 pl-1">
                  {role === 'Faculty' && (
                    <>
                      <li>• Submit event proposals with real-time room conflict detection.</li>
                      <li>• Apply for faculty leaves (Casual, Medical, OD) with lecture swaps.</li>
                      <li>• Download certified letterhead letters once sanctioned.</li>
                    </>
                  )}
                  {role === 'HOD' && (
                    <>
                      <li>• Endorse or reject proposals originating in your department.</li>
                      <li>• Review faculty leave requests and lecture adjustment allocations.</li>
                      <li>• Approve departmental seminar hall and lab bookings.</li>
                    </>
                  )}
                  {role === 'Dean' && (
                    <>
                      <li>• Institutional oversight across all engineering departments.</li>
                      <li>• Review student body and departmental event proposals.</li>
                      <li>• Forward endorsed proposals to the Principal Office.</li>
                    </>
                  )}
                  {role === 'Principal' && (
                    <>
                      <li>• Final sanction authority for all college events & budget clearances.</li>
                      <li>• Official approval and grant of all faculty leave orders.</li>
                      <li>• Institutional staff appointments, password resets, and settings.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Permission Requests Walkthrough */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                  Step 2: Event Permission Requests
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Digital Proposals, Venue Bookings & Budget Approvals
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Eliminating manual paper movement. Every event follows a verified digital audit trail:
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1B365D] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Submit Event Proposal</span>
                    <span>Enter event details, target audience, schedule, required labs/auditorium, and budget heads.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1B365D] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Automated Venue Conflict Check</span>
                    <span>The system prevents double-booking seminar halls, classrooms, and grounds on conflicting dates.</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1B365D] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Official Sealed Permission Letter</span>
                    <span>Upon Principal sanction, download or print the official college letterhead document with digital verification stamp.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Faculty Leave Management */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                  Step 3: Faculty Leave Management
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Leave Applications with Academic Continuity
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Leave applications ensure that classes and student sessions are never disrupted:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-900 block mb-1">Leave Types Supported</span>
                  <span className="text-slate-600 block leading-relaxed">
                    Casual Leave (CL), Medical Leave (ML), On Duty (OD for university valuation/conferences), Earned Leave (EL), and Comp-Off.
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-900 block mb-1">Lecture Adjustments</span>
                  <span className="text-slate-600 block leading-relaxed">
                    Faculty specify substitute colleagues taking lecture/lab load during absence.
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-900 block">Two-Tier Sanction Flow:</span>
                <p className="text-slate-600">
                  Faculty submits &rarr; HOD reviews lecture substitutions and recommends &rarr; Principal issues final sanction order.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Reporting & Navigation */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                  Step 4: Exports & Reports
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready for NAAC, NBA, and Academic Audits
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  All records are structured and ready for institutional reporting:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Download size={14} className="text-[#1B365D]" /> 1-Click CSV Export
                  </div>
                  <p className="text-slate-600">
                    Download clean CSV files for event proposals, faculty leaves, and directory logs with UTF-8 encoding.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <HelpCircle size={14} className="text-[#1B365D]" /> Need Help Later?
                  </div>
                  <p className="text-slate-600">
                    You can reopen this guide anytime by clicking the <b>Guide</b> button in the top navigation bar.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>You are all set! Click <b>Enter Portal</b> below to start using Docworm.</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Skip Guide
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B365D] hover:bg-[#152a48] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Next Step</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 size={14} />
                <span>Enter Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
