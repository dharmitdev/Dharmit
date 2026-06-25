import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, Eye, EyeOff, AlertCircle, LogIn, RefreshCw, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  // Navigation & credentials states
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP states
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [timer, setTimer] = useState<number>(120);
  const [showOtpNotification, setShowOtpNotification] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState<boolean>(false);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Clean-up on close
  const handleClose = () => {
    setStep('credentials');
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setError('');
    setShowOtpNotification(false);
    onClose();
  };

  const sendOtpEmail = async (targetEmail: string, code: string) => {
    try {
      await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          "Service Name": "Materials Desk - Administrative Authorization",
          "Verification Code": code,
          "Expires In": "2 Minutes",
          "Security Action": "Please copy and paste this verification code into the login input boxes on Materials Desk to complete your authorization.",
          "_subject": `[Materials Desk] Admin OTP Verification Code: ${code}`,
          "_honey": ""
        })
      });
    } catch (err) {
      console.error('Error dispatching OTP email:', err);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const enteredEmail = email.trim().toLowerCase();
    const correctPassword = 'Dharmit@3560';

    // Support any valid email address for versatile administrative testing
    if (enteredEmail.includes('@') && password === correctPassword) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      
      // Dispatch the actual OTP verification email
      await sendOtpEmail(email.trim(), code);

      setStep('otp');
      setOtp(['', '', '', '', '', '']);
      setTimer(120);
      setShowOtpNotification(true);
    } else {
      setError('Invalid administrative email address or security key.');
    }
    setIsSubmitting(false);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setIsOtpSubmitting(true);

    setTimeout(() => {
      const enteredOtp = otp.join('');
      if (enteredOtp === generatedOtp) {
        onLoginSuccess();
        handleClose();
      } else {
        setOtpError('The 6-digit verification code you entered is invalid. Please check and try again.');
      }
      setIsOtpSubmitting(false);
    }, 600);
  };

  // OTP individual digit logic
  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Keep only the latest character
    setOtp(newOtp);

    // Auto-focus next input box if currently writing
    if (value && element.nextElementSibling) {
      (element.nextElementSibling as HTMLInputElement).focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (!otp[index] && e.currentTarget.previousElementSibling) {
        const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement;
        prevInput.focus();
        newOtp[index - 1] = '';
      } else {
        newOtp[index] = '';
      }
      setOtp(newOtp);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === 6 && !isNaN(Number(pastedData))) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      // Focus the last input box
      const inputs = document.querySelectorAll('.otp-box-input');
      if (inputs && inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).focus();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10"
            id="login-modal"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
              id="login-close"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Header */}
            <div className="mb-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-950 dark:bg-slate-800 flex items-center justify-center mx-auto shadow-md border border-slate-200/10 mb-3">
                {step === 'credentials' ? (
                  <Lock className="w-6 h-6 text-amber-500" />
                ) : (
                  <KeyRound className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
                {step === 'credentials' ? 'Admin Authentication' : 'Two-Step Verification'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-sans">
                {step === 'credentials' 
                  ? 'Access your database management and inventory control dashboard'
                  : 'Verify your administrative session with a security verification code'}
              </p>
            </div>

            {/* Step 1: Username & Password */}
            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 font-sans"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                    Admin Email ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="abc@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 dark:focus:ring-slate-400 transition-all placeholder:text-slate-400/70"
                      id="login-email-input"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                      Security Key
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 dark:focus:ring-slate-400 transition-all placeholder:text-slate-400/70"
                      id="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      id="login-password-toggle"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-sans font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-6"
                  id="login-submit-button"
                >
                  {isSubmitting ? (
                    <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Send Verification Code</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: OTP Entry */
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 font-sans"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </motion.div>
                )}

                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    We have dispatched a 6-digit security code to your registered admin email:
                  </p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 font-mono tracking-wider">
                    {email}
                  </p>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 bg-amber-50/70 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 leading-normal text-left font-sans">
                    💡 <strong>First-Time Setup:</strong> If the email hasn't arrived, please check your Spam/Junk folder for a <strong>FormSubmit Activation</strong> request to authorize this application to deliver messages, or use the <strong>Autofill Code</strong> simulator on the top-right.
                  </div>
                </div>

                {/* OTP digit inputs */}
                <div className="grid grid-cols-6 gap-2 sm:gap-3 justify-center my-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onPaste={handleOtpPaste}
                      className="otp-box-input w-full h-12 text-center text-base sm:text-lg font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-slate-500 dark:focus:ring-slate-400 text-slate-800 dark:text-slate-100 transition-all font-mono"
                      id={`otp-input-${index}`}
                    />
                  ))}
                </div>

                {/* Resend Actions & Countdown */}
                <div className="flex items-center justify-between text-[11px] font-sans text-slate-400">
                  <span>
                    {timer > 0 ? (
                      `Expires in: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
                    ) : (
                      <span className="text-rose-500 font-medium">Code expired</span>
                    )}
                  </span>
                  
                  <button
                    type="button"
                    disabled={timer > 90}
                    onClick={async () => {
                      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                      setGeneratedOtp(newCode);
                      setOtp(['', '', '', '', '', '']);
                      setTimer(120);
                      setOtpError('');
                      setShowOtpNotification(true);
                      await sendOtpEmail(email.trim(), newCode);
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 font-medium disabled:opacity-30 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                </div>

                {/* OTP Actions buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-sans font-medium text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Back to login
                  </button>

                  <button
                    type="submit"
                    disabled={isOtpSubmitting || otp.some(digit => !digit)}
                    className="flex-2 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-sans font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    id="otp-submit-button"
                  >
                    {isOtpSubmitting ? (
                      <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Authorize Access</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Simulated Email Notification Toast */}
      <AnimatePresence>
        {isOpen && showOtpNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-55 w-full max-w-sm bg-slate-950 text-white rounded-2xl p-4 shadow-2xl border border-slate-800/80 font-sans"
            id="simulated-email-toast"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-500 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Mail Delivery Simulator
                </span>
              </div>
              <button
                onClick={() => setShowOtpNotification(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-1 text-slate-300 text-xs">
              <p className="text-slate-400 text-[10px]">
                To: <span className="text-slate-200 font-mono">{email}</span>
              </p>
              <p className="text-slate-400 text-[10px]">
                Subject: <span className="text-slate-200 font-sans font-medium">[Materials Desk] Authentication Verification OTP</span>
              </p>
              
              <div className="mt-3 p-3 bg-slate-900 border border-slate-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 block font-mono">Verification Code</span>
                  <span className="text-lg font-bold tracking-widest text-slate-50 font-mono">{generatedOtp}</span>
                </div>
                
                <button
                  onClick={() => {
                    setOtp(generatedOtp.split(''));
                    setShowOtpNotification(false);
                  }}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Autofill Code
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
