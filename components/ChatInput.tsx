import { useState, useRef, useEffect } from "react";
import themeColors from "../utils/theme";
import TouchButton from "./ui/TouchButton";
import { trackMessageSent } from "@/lib/analytics";
import { useLocalization } from "@/contexts/LocalizationContext";
import { t } from "@/lib/translations";

interface ChatInputProps {
  onSend: (message: string) => void;
  character: string;
  inputWrapRef?: HTMLDivElement;
  isAnonymous?: boolean;
  anonCount?: number;
  remaining?: number;
  // For authenticated users daily limit enforcement
  dailyLimitReached?: boolean;
  paid?: boolean;
  // External disable (e.g., while loading rate limit status)
  disabled?: boolean;
}

export default function ChatInput({ onSend, character, inputWrapRef, isAnonymous = false, anonCount = 0, remaining = 5, dailyLimitReached = false, paid = false, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const theme = themeColors[character.toLowerCase()] || themeColors.default;
  const { locale } = useLocalization();

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Scroll into view when input is focused
  useEffect(() => {
    const handleFocus = () => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const el = textareaRef.current;
    el?.addEventListener("focus", handleFocus);
    return () => el?.removeEventListener("focus", handleFocus);
  }, []);

  const handleSend = () => {
    console.log('🔍 ChatInput handleSend called:', {
      message: message.trim(),
      hasMessage: !!message.trim(),
      isAnonymous,
      remaining,
      paid,
      dailyLimitReached,
      onSend: typeof onSend
    });

    if (!message.trim()) {
      console.log('🚫 ChatInput: Empty message, not sending');
      return;
    }

    // 🎉 FREEMIUM MODEL: No more rate limit blocking!
    // Chat is unlimited for everyone - only check for empty messages

    try {
      console.log('✅ ChatInput: Calling onSend with message:', message.trim());
      onSend(message.trim());
      setMessage("");
    } catch (error) {
      console.error('❌ ChatInput: Error calling onSend:', error);
    }
  };

  // Get placeholder text based on user state
  const getPlaceholder = () => {
    // 🎉 FREEMIUM MODEL: Chat is unlimited! Just show friendly prompt
    return t('typeMessage', locale.language);
  };

  // Check if input should be disabled - only disabled if externally disabled
  const isDisabled = disabled;

  return (
    <div
      data-testid="chat-input-container"
      className="fixed bottom-0 left-0 right-0 w-full flex items-end gap-3 border-t input-wrapper z-50"
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.accent,
        // Eliminate gaps with precise positioning
        margin: 0,
        padding: '16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        // Enhanced mobile styling with better blur
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        // Safe area inset handling - more precise
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        // Ensure no gaps by setting explicit positioning
        transform: 'translateZ(0)', // Force hardware acceleration
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <textarea
        ref={textareaRef}
        data-testid="chat-input-textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        rows={1}
        placeholder={getPlaceholder()}
        disabled={isDisabled}
        className="flex-1 resize-none overflow-hidden rounded-2xl border px-4 py-3 text-base focus:outline-none"
        style={{
          backgroundColor: isDisabled ? "#f5f5f5" : "#fff",
          color: isDisabled ? "#9ca3af" : theme.accent,
          borderColor: isDisabled ? "#d1d5db" : theme.accent,
          fontSize: '16px', // Prevents zoom on iOS
          minHeight: '48px', // WCAG compliant touch target
          borderWidth: '2px',
          boxShadow: isDisabled ? 'none' : `0 2px 8px ${theme.accent}20`,
          transition: 'all 0.2s ease',
          cursor: isDisabled ? 'not-allowed' : 'text'
        }}
      />
      <TouchButton
        onClick={handleSend}
        variant="primary"
        size="lg"
        touchFeedback={true}
        disabled={!message.trim() || isDisabled}
        data-testid="chat-send-button"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`,
          color: "#ffffff",
          borderRadius: "1rem",
          fontWeight: 600,
          minHeight: "48px",
          minWidth: "64px",
          boxShadow: `0 4px 12px ${theme.accent}40`,
          // Enhanced for mobile
        }}
      >
        {t('sendMessage', locale.language)}
      </TouchButton>
    </div>
  );
}
