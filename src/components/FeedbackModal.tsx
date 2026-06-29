import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MessageSquare, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  Send,
  UploadCloud,
  FileText,
  File,
  Trash2
} from 'lucide-react';
import { submitFeedback, getAppSettings, updateFeedbackEmailStatus } from '../lib/firebase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'bug' | 'suggestion' | 'inquiry' | 'other'>('bug');
  const [message, setMessage] = useState('');
  
  // File upload state
  const [attachment, setAttachment] = useState<{
    name: string;
    type: string;
    data: string; // Base64
    size: number;
  } | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validation
  const [nameTouched, setNameTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);

  const isNameInvalid = nameTouched && !name.trim();
  const isMessageInvalid = messageTouched && !message.trim();

  const handleClose = () => {
    // Reset states on close
    setName('');
    setEmail('');
    setType('bug');
    setMessage('');
    setAttachment(null);
    setAttachmentFile(null);
    setDragActive(false);
    setIsSubmitting(false);
    setSubmitSuccess(false);
    setError('');
    setNameTouched(false);
    setMessageTouched(false);
    onClose();
  };

  const processFile = (file: File) => {
    if (!file) return;

    // Check size limit: 5 MB = 5 * 1024 * 1024 bytes
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please upload a file smaller than 5 MB to ensure delivery.`);
      return;
    }

    setError('');
    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setAttachment({
          name: file.name,
          type: file.type,
          data: e.target.result,
          size: file.size
        });
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try another one.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setMessageTouched(true);

    if (!name.trim() || !message.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // 1. Submit to Firestore first
      const feedbackId = await submitFeedback({
        name: name.trim(),
        email: email.trim() || undefined,
        type,
        message: message.trim(),
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
        attachmentData: attachment?.data
      });

      // 2. Dispatch email notification asynchronously
      try {
        const settings = await getAppSettings();
        const accessKey = settings.web3FormsKey || (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string);

        if (accessKey && settings.emailNotificationsEnabled !== false) {
          updateFeedbackEmailStatus(feedbackId, 'pending');

          const formData = new FormData();
          formData.append("access_key", accessKey);
          formData.append("name", name.trim());
          formData.append("email", email.trim() || "no-reply@pipecalc.com");
          formData.append("subject", `[Pipe Calc Feedback] New ${type.toUpperCase()} from ${name.trim()}`);

          // Append structured key-value pairs for Web3Forms to display nicely in the email layout
          formData.append("Submitter Name", name.trim());
          formData.append("Submitter Email", email.trim() || "Not Provided");
          formData.append("Feedback Type", type.toUpperCase());
          formData.append("Feedback Message", message.trim());

          let emailBody = `You have received a new ${type.toUpperCase()} submission from the Pipe Dimension Calculator feedback form.\n\n`;
          emailBody += `Name: ${name.trim()}\n`;
          emailBody += `Email: ${email.trim() || 'Not Provided'}\n`;
          emailBody += `Type: ${type.toUpperCase()}\n`;
          emailBody += `Submitted At: ${new Date().toLocaleString()}\n\n`;
          emailBody += `Message:\n----------------------------------------\n${message.trim()}\n----------------------------------------\n\n`;

          if (attachment) {
            emailBody += `Attachment Name: ${attachment.name}\n`;
            emailBody += `Attachment Size: ${attachment.size > 1024 * 1024 ? (attachment.size / (1024 * 1024)).toFixed(1) + ' MB' : (attachment.size / 1024).toFixed(1) + ' KB'}\n`;
            emailBody += `You can view or download this attachment directly inside your Pipe Calc Admin Panel.`;
            
            formData.append("Attachment Filename", attachment.name);
            formData.append("Attachment Size", attachment.size > 1024 * 1024 ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB` : `${(attachment.size / 1024).toFixed(1)} KB`);
          }

          formData.append("message", emailBody);

          if (settings.notificationRecipient) {
            formData.append("to", settings.notificationRecipient);
          }

          if (attachmentFile) {
            formData.append("attachment", attachmentFile);
          }

          // Trigger email dispatch asynchronously (non-blocking)
          fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log("Email notification dispatched successfully via Web3Forms.");
              updateFeedbackEmailStatus(feedbackId, 'success');
            } else {
              console.warn("Web3Forms email dispatch response was unsuccessful:", data.message);
              updateFeedbackEmailStatus(feedbackId, 'failed', data.message || 'Web3Forms unsuccessful status response');
            }
          })
          .catch(err => {
            console.error("Web3Forms network request failed:", err);
            updateFeedbackEmailStatus(feedbackId, 'failed', err.message || 'Web3Forms network request failed');
          });
        }
      } catch (emailErr: any) {
        // Prevent email dispatch failures from blocking the main user success flow
        console.error("Failed to construct or dispatch email notification:", emailErr);
        updateFeedbackEmailStatus(feedbackId, 'failed', emailErr.message || 'Construction error');
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit feedback. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 z-10"
            id="feedback-modal"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
              id="feedback-close-btn"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Content Switch: Form vs Success Screen */}
            {!submitSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white">
                      <MessageSquare className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white">
                        Submit Feedback & Bug Reports
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-sans">
                        Encountered a bug or have an idea? Let us know to help us improve the platform.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 font-sans">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name field (MANDATORY) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center justify-between">
                    <span>Full Name <span className="text-rose-500">*</span></span>
                    {isNameInvalid && <span className="text-rose-500 lowercase font-sans">Required field</span>}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onBlur={() => setNameTouched(true)}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (e.target.value.trim()) setError('');
                      }}
                      placeholder="Your name"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border ${
                        isNameInvalid 
                          ? 'border-rose-500 focus:ring-rose-400' 
                          : 'border-slate-200 dark:border-slate-800 focus:ring-slate-450 dark:focus:ring-slate-700'
                      } rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 transition-all`}
                      id="feedback-name-input"
                    />
                  </div>
                </div>

                {/* Email field (OPTIONAL) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-450 dark:focus:ring-slate-700 transition-all"
                      id="feedback-email-input"
                    />
                  </div>
                </div>

                {/* Feedback Type (Selector) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                    Type of Feedback
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('bug')}
                      className={`p-2.5 border rounded-xl text-[11px] font-sans font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        type === 'bug'
                          ? 'bg-rose-50/50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Bug Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('suggestion')}
                      className={`p-2.5 border rounded-xl text-[11px] font-sans font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        type === 'suggestion'
                          ? 'bg-amber-50/50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Suggestion</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('inquiry')}
                      className={`p-2.5 border rounded-xl text-[11px] font-sans font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        type === 'inquiry'
                          ? 'bg-indigo-50/50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/60 dark:text-indigo-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Inquiry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('other')}
                      className={`p-2.5 border rounded-xl text-[11px] font-sans font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        type === 'other'
                          ? 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Other</span>
                    </button>
                  </div>
                </div>

                {/* Message field (MANDATORY) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center justify-between">
                    <span>Message Description <span className="text-rose-500">*</span></span>
                    {isMessageInvalid && <span className="text-rose-500 lowercase font-sans">Required field</span>}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onBlur={() => setMessageTouched(true)}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (e.target.value.trim()) setError('');
                    }}
                    placeholder="Provide details about the bug, issue, or request..."
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border ${
                      isMessageInvalid 
                        ? 'border-rose-500 focus:ring-rose-400' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-slate-450 dark:focus:ring-slate-700'
                    } rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 transition-all resize-none`}
                    id="feedback-message-textarea"
                  />
                </div>

                {/* File Attachment Area */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                    Upload Attachment (Screenshot, PDF, JPG, etc. Max 5MB)
                  </label>
                  
                  {!attachment ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50/25 dark:bg-indigo-950/15'
                          : 'border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-950'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="feedback-file-input"
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <UploadCloud className={`w-5.5 h-5.5 ${dragActive ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
                        <p className="text-[10.5px] font-sans text-slate-600 dark:text-slate-300">
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag & drop here
                        </p>
                        <p className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider">
                          PNG, JPG, JPEG, or PDF up to 5 MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Attachment Preview Card */
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl animate-fade-in">
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        {/* File Thumbnail or Icon */}
                        {attachment.type.startsWith('image/') ? (
                          <div className="relative w-8.5 h-8.5 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex items-center justify-center">
                            <img
                              src={attachment.data}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-8.5 h-8.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30 animate-fade-in">
                            {attachment.type.includes('pdf') ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate font-sans">
                            {attachment.name}
                          </p>
                          <p className="text-[8.5px] font-mono text-slate-400 uppercase mt-0.5">
                            {attachment.size > 1024 * 1024
                              ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${(attachment.size / 1024).toFixed(1)} KB`} · {attachment.type.split('/')[1] || 'FILE'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer shrink-0"
                        title="Remove file"
                        id="remove-attachment-btn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-sans font-medium text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim() || !message.trim()}
                    className="flex-2 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-sans font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    id="feedback-submit-btn"
                  >
                    {isSubmitting ? (
                      <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 px-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
                  Thank You for Your Feedback!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto font-sans">
                  Hello <strong className="text-slate-800 dark:text-slate-200">{name}</strong>, we have received your submission. Our systems administration has logged your report, and we will address it promptly.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-sans font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                    id="feedback-success-close-btn"
                  >
                    Return to App
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
