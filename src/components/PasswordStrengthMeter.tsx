'use client';

import React from 'react';
import { Check, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { evaluatePasswordStrength } from '../lib/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const feedback = evaluatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2 text-xs">
      {/* Progress Bars */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Password Strength:</span>
          <span className={`font-semibold ${feedback.textColor} flex items-center gap-1`}>
            {feedback.score >= 3 ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            {feedback.label}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-full rounded-full transition-all duration-300 ${
                feedback.score >= step ? feedback.color : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Real-Time Requirements Checklist */}
      {showRequirements && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            {feedback.requirements.length ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={feedback.requirements.length ? 'text-slate-900 font-medium' : ''}>
              Min 12 characters
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {feedback.requirements.uppercase ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={feedback.requirements.uppercase ? 'text-slate-900 font-medium' : ''}>
              Uppercase (A-Z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {feedback.requirements.lowercase ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={feedback.requirements.lowercase ? 'text-slate-900 font-medium' : ''}>
              Lowercase (a-z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {feedback.requirements.number ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={feedback.requirements.number ? 'text-slate-900 font-medium' : ''}>
              Number (0-9)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {feedback.requirements.symbol ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-slate-400" />
            )}
            <span className={feedback.requirements.symbol ? 'text-slate-900 font-medium' : ''}>
              Special Symbol
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {feedback.requirements.notCommon ? (
              <Check size={12} className="text-emerald-600 font-bold" />
            ) : (
              <X size={12} className="text-rose-500 font-bold" />
            )}
            <span className={feedback.requirements.notCommon ? 'text-slate-900 font-medium' : 'text-rose-600'}>
              Unique & unbreached
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
