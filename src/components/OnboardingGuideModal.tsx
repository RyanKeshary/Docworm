'use client';

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
  HelpCircle,
  Clock,
  Check,
  AlertCircle,
  FileCheck,
  Users,
  Settings,
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

  const role = currentUser.role || 'Faculty';

  const handleClose = () => {
    if (currentUser?.id) {
      localStorage.setItem(`docworm_guide_seen_${currentUser.id}`, 'true');
    }
    onClose();
  };

  const handleFinish = () => {
    handleClose();
  };

  // Role metadata and title customization
  const roleInfo = {
    Principal: {
      title: 'Principal Institutional Head Guide',
      badge: '👑 Master Authority',
      accentBg: 'bg-violet-900',
      badgeBg: 'bg-violet-800 text-violet-200',
    },
    Dean: {
      title: 'Dean Student Welfare & Academic Guide',
      badge: '🎓 Academic Oversight',
      accentBg: 'bg-blue-900',
      badgeBg: 'bg-blue-800 text-blue-200',
    },
    HOD: {
      title: `Head of Department Guide (Dept of ${currentUser.department || 'Engineering'})`,
      badge: '🏢 Department Head',
      accentBg: 'bg-emerald-900',
      badgeBg: 'bg-emerald-800 text-emerald-200',
    },
    Faculty: {
      title: 'Faculty Coordinator & Submitter Guide',
      badge: '👤 Faculty Coordinator',
      accentBg: 'bg-[#1B365D]',
      badgeBg: 'bg-white/15 text-blue-200',
    },
  }[role] || {
    title: 'Portal Walkthrough & Guide',
    badge: 'Docworm Guide',
    accentBg: 'bg-[#1B365D]',
    badgeBg: 'bg-white/15 text-blue-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className={`${roleInfo.accentBg} text-white px-6 py-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              {role === 'Principal' && <Crown size={22} />}
              {role === 'Dean' && <GraduationCap size={22} />}
              {role === 'HOD' && <Building size={22} />}
              {role === 'Faculty' && <User size={22} />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${roleInfo.badgeBg}`}>
                  {roleInfo.badge}
                </span>
                <span className="text-xs text-white/70">Step {currentStep} of {totalSteps}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">{roleInfo.title}</h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content based on Role */}
        <div className="p-6 sm:p-8 flex-1 space-y-6 min-h-[340px]">
          {/* ========================================================= */}
          {/* PRINCIPAL TUTORIAL */}
          {/* ========================================================= */}
          {role === 'Principal' && (
            <>
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block mb-1">
                      Step 1: Institutional Authority & Sanctions
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Final Sanction Desk & Budget Clearance</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      As Principal & Head of Institution, you hold sole final sanction authority across all academic departments:
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">1</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Single-Click Final Sanction</span>
                        <span>Grant official clearance on proposals endorsed by HODs and reviewed by the Dean. Once sanctioned, digital letterhead letters unlock instantly.</span>
                      </div>
                    </div>
                    <div className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">2</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Force Approve & Emergency Override</span>
                        <span>Override lower-tier review bottlenecks in emergency situations or high-priority institutional mandates.</span>
                      </div>
                    </div>
                    <div className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">3</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Budget Sanctioning</span>
                        <span>Authorize requested event finances and track department expenditure against annual institutional allocations.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block mb-1">
                      Step 2: Faculty Leave Orders
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Official Granting of Faculty Leaves</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Review leaves recommended by HODs and issue authorized institutional leave orders:
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-slate-900 block">HOD Recommendations</span>
                      <p className="text-slate-600">Ensure the department HOD has validated lecture swaps and colleague substitutions before issuing sanction.</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-slate-900 block">Duty Leaves (OD) Clearance</span>
                      <p className="text-slate-600">Review On-Duty requests for Mumbai University paper evaluations, conferences, and external academic duties.</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Faculty and HOD receive instant real-time notification upon your leave decision.</span>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block mb-1">
                      Step 3: Leadership & Staff Governance
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Appointing Deans, HODs, and Faculty</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Only the Principal can appoint Deans and institutional heads:
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                      <Users size={16} className="text-violet-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block">Appoint Leadership & Staff</span>
                        <span>Navigate to <b>Settings &rarr; Leadership & Staff</b> to add Deans, Department Heads, and Faculty coordinators.</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                      <FileCheck size={16} className="text-violet-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block">Verify Pending Faculty Registrations</span>
                        <span>New self-registered faculty accounts appear in your verification queue. Approve registrations to activate their login immediately.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-violet-700 uppercase tracking-wider block mb-1">
                      Step 4: Institutional Letterhead & Audit
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">College Letterhead, Options & Audit Trail</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Institutional configuration tools available exclusively to the Principal:
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Official Letterhead Header</span>
                      <p className="text-slate-600">Update college address, phone, and seal in <b>Settings &rarr; College Letterhead</b>. Applied to all exported PDFs.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Tamper-Proof Audit Trail</span>
                      <p className="text-slate-600">Review chronological, immutable logs of every approval, edit, and appointment in <b>Settings &rarr; Audit Log</b>.</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Your master administrative session is fully active. Click <b>Enter Portal</b> to begin.</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* DEAN TUTORIAL */}
          {/* ========================================================= */}
          {role === 'Dean' && (
            <>
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      Step 1: Student Welfare & Academic Oversight
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Cross-Department Coordination & Review</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      As Dean, you supervise student councils, collegiate committees, and inter-departmental initiatives:
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">1</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Inter-Departmental Oversight</span>
                        <span>View proposals from all engineering branches and centralized bodies (Student Council, NSS, Rotaract, Sports Committee).</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">2</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Review After Department Endorsement</span>
                        <span>Proposals endorsed by HODs arrive at your desk for academic suitability and policy check before reaching the Principal.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      Step 2: Recommending & Forwarding Proposals
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Academic Recommendation Workflow</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      How to take action on proposals awaiting Dean review:
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Recommend & Forward</span>
                      <p className="text-slate-600">Click <b>Review / Endorse</b> on a pending proposal. Enter remarks and forward directly to the Principal Office for sanction.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Request Adjustments / Return</span>
                      <p className="text-slate-600">If budget heads or schedule conflicts require correction, request changes with detailed notes sent back to the coordinator.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      Step 3: Venue Utilization & Clash Resolution
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Campus-Wide Space Coordination</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Ensure auditorium, seminar halls, and college grounds are fairly scheduled:
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-900 block">Real-Time Conflict Prevention</span>
                    <p className="text-slate-600 leading-relaxed">
                      Docworm flags venue clashes automatically. In your review panel, you will see if another department has booked the seminar hall on the same day/time, allowing you to arbitrate scheduling disputes.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      Step 4: Staff Directory & Adding HODs
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Appointing Department Heads & Faculty</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Dean staff management privileges:
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-slate-900 block">Authorized Scope:</span>
                    <p className="text-slate-600">• In <b>Settings &rarr; Staff & Faculty</b>, you can appoint new Heads of Department (HODs) and Faculty members.</p>
                    <p className="text-slate-600">• Your staff directory displays all active HODs and Faculty members across the college.</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>You are ready to coordinate college proposals! Click <b>Enter Portal</b>.</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* HOD TUTORIAL */}
          {/* ========================================================= */}
          {role === 'HOD' && (
            <>
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      Step 1: Department Head Desk
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">First-Level Departmental Review</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      As Head of Department ({currentUser.department || 'Your Department'}), you are the first reviewer in the approval chain:
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">1</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Department-Scoped Oversight</span>
                        <span>You view all activity proposals and leave applications originating from faculty within the Department of {currentUser.department || 'Engineering'}.</span>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">2</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Fast-Track Endorsement</span>
                        <span>Review event objectives, syllabus alignment, target students, and budget breakdown, then endorse to forward directly to the Dean.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      Step 2: Department Labs & Seminar Halls
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Lab & Venue Clearances</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage classrooms and departmental computer labs:
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-slate-900 block">Approve Department Resources:</span>
                    <p className="text-slate-600">When a proposal requests labs or departmental seminar rooms owned by {currentUser.department || 'your department'}, your endorsement automatically grants preliminary venue clearance.</p>
                  </div>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <span className="font-bold block">Automated Timetable Clashes</span>
                    <p>The system flags if practical exam batches or lectures coincide with requested dates.</p>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      Step 3: Faculty Leave Verifications
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Checking Lecture Adjustments</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Safeguard academic syllabus continuity before leave approval:
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Colleague Lecture Swaps</span>
                      <p className="text-slate-600">Verify that the applying faculty member has named substitute faculty who will take their lecture or lab hours during their absence.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Recommend to Principal</span>
                      <p className="text-slate-600">Once satisfied, add your recommendation remark and send to the Principal for the final leave order sanction.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      Step 4: Managing Department Faculty
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Adding Faculty to Dept of {currentUser.department || 'Engineering'}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Add faculty members to your department directory:
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-slate-900 block">Department Faculty Scope:</span>
                    <p className="text-slate-600">• In <b>Settings &rarr; Department Faculty</b>, you can add new Faculty coordinators directly into the Dept of {currentUser.department || 'Engineering'}.</p>
                    <p className="text-slate-600">• Your staff directory displays only faculty members belonging to your department.</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Your HOD panel is active and ready. Click <b>Enter Portal</b>.</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* FACULTY TUTORIAL */}
          {/* ========================================================= */}
          {role === 'Faculty' && (
            <>
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                      Step 1: Activity Permission Requests
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Digital Proposal Creation in Seconds</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Submit guest lectures, workshops, industrial visits, and fests digitally:
                    </p>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1B365D] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">1</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Click "+ New Permission Request"</span>
                        <span>Enter event title, date range, department, student count, and budget heads.</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1B365D] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">2</div>
                      <div>
                        <span className="font-bold text-slate-900 block">Instant Venue Conflict Detection</span>
                        <span>The system checks seminar halls and labs in real time to ensure no double-booking clashes.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                      Step 2: Faculty Leave Applications
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Leave Requests with Colleague Adjustments</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Apply for leaves without manual paper circulation:
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Supported Leave Types</span>
                      <p className="text-slate-600">Casual Leave (CL), On Duty (OD for university paper correction/conferences), Medical Leave, and Comp-Off.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Lecture Load Substitutions</span>
                      <p className="text-slate-600">Enter which colleague faculty member has agreed to cover your teaching or lab periods.</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                    <span className="font-bold text-slate-900 block">Approval Chain:</span>
                    Faculty submits &rarr; HOD reviews & recommends &rarr; Principal issues final sanction order.
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                      Step 3: Tracking & Official Letters
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Real-Time Approvals & Downloadable Letters</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Know exactly where your request stands at every moment:
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Live Status Badges</span>
                      <p className="text-slate-600">Track your proposal as it moves through: <b>Submitted &rarr; HOD Endorsed &rarr; Dean Recommended &rarr; Principal Sanctioned</b>.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-0.5">Download Official Letterhead</span>
                      <p className="text-slate-600">Once approved by the Principal, click <b>Export Letter</b> to generate a sealed, formatted PDF document with digital signatures ready for printing.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-[#1B365D] uppercase tracking-wider block mb-1">
                      Step 4: Post-Event Completion Reports
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">Documentation for NAAC / NBA Accreditation</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Close the loop after your event concludes:
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-slate-900 block">Submit Completion Summary:</span>
                    <p className="text-slate-600">Record final attendance figures, upload event geotagged photographs, and submit feedback scores directly into the portal for annual academic audit records.</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>You are ready to draft your first event proposal! Click <b>Enter Portal</b>.</span>
                  </div>
                </div>
              )}
            </>
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-xs transition-colors"
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
