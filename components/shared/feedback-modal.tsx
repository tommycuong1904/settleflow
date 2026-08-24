"use client";

import React, { useState, useRef } from "react";
import {
  X,
  MessageSquareHeart,
  Send,
  Loader2,
  Sparkles,
  Smile,
  Meh,
  Frown,
  Bug,
  Lightbulb,
  Heart,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useToast } from "@/lib/context/toast-context";
import { useWallet } from "@/lib/context/wallet-context";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { toast } = useToast();
  const { address, email } = useWallet();
  const productContext = useResolvedProductContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(isOpen);

  const [category, setCategory] = useState<"idea" | "bug" | "praise" | "general">("idea");
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "warning",
        title: "File Too Large",
        description: "Please attach an image smaller than 5MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setAttachedImage(null);
    setImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating,
          message: message.trim(),
          attachedImage,
          userEmail: email,
          userAddress: address,
          role: productContext.actor,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit feedback. Please try again.");
      }

      setIsSubmitted(true);
      toast({
        variant: "success",
        title: "Feedback Received!",
        description: "Thank you for helping us improve SettleFlow on Arc.",
      });

      setTimeout(() => {
        setIsSubmitted(false);
        setMessage("");
        removeImage();
        onClose();
      }, 2000);
    } catch (err) {
      toast({
        variant: "error",
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[480px] overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--accent-emerald)] border border-[var(--border-soft)]">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">Thank You!</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-[280px] mx-auto leading-relaxed">
              Your feedback is immensely valuable in making SettleFlow the smoothest payout platform.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)] shrink-0">
                <MessageSquareHeart size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                  Send Feedback
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Help us refine the Arc milestone settlement experience
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Feedback Topic
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "idea", label: "Idea", icon: Lightbulb },
                    { id: "bug", label: "Bug", icon: Bug },
                    { id: "praise", label: "Praise", icon: Heart },
                    { id: "general", label: "Other", icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item.id as typeof category)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all text-xs font-medium ${
                          isSelected
                            ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                            : "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience Rating */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  How is your experience?
                </label>
                <div className="flex items-center justify-center gap-4 p-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)]">
                  {[
                    { val: 1, label: "Needs work", icon: Frown },
                    { val: 3, label: "Good", icon: Meh },
                    { val: 5, label: "Great!", icon: Smile },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSelected = rating === r.val;
                    return (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setRating(r.val)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-[var(--foreground)] text-[var(--background)]"
                            : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <Icon size={16} className={isSelected ? "" : "text-[var(--text-muted)]"} />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Your Thoughts or Suggestions
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What did you like? What can we make better for Arc payout settlements?"
                  className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:border-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] transition-all resize-none"
                />
              </div>

              {/* Image Attachment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Attach Screenshot (Optional)
                  </label>
                  {attachedImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                {attachedImage ? (
                  <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-2.5 flex items-center gap-3 animate-in fade-in">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachedImage}
                      alt="Attachment preview"
                      className="h-12 w-12 rounded-xl object-cover border border-[var(--border-soft)] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">{imageName || "screenshot.png"}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Ready to upload</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] hover:border-[var(--foreground)] bg-[var(--surface-muted)] hover:bg-[var(--surface-strong)] py-3 px-4 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all"
                  >
                    <UploadCloud size={16} />
                    <span>Click to attach image (Max 5MB)</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 py-2.5 px-4 text-xs font-semibold text-[var(--background)] transition-all disabled:opacity-50 shadow-md active:scale-[0.99] pt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Feedback
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
