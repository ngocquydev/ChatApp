import { useState, useCallback, RefObject } from "react";
import type { MentionCandidate } from "@/components/common/MentionAutocomplete";

/**
 * Hook quản lý trạng thái gõ và gợi ý @mention bạn bè & Aura Bot
 */
export function useMention(
  text: string,
  setText: (newText: string) => void,
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAnchorEl, setMentionAnchorEl] = useState<HTMLElement | null>(null);

  const checkMention = useCallback(
    (val: string, cursorIndex?: number) => {
      const input = inputRef.current;
      const pos = cursorIndex ?? input?.selectionStart ?? val.length;
      const textBeforeCursor = val.slice(0, pos);

      // Tìm ký tự @ gần nhất trước con trỏ
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
        // Kích hoạt khi @ đứng đầu dòng hoặc ngay sau khoảng trắng/dấu xuống dòng
        if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
          const query = textBeforeCursor.slice(lastAtIndex + 1);
          // Query chưa xuống dòng và tối đa 2 từ (cho tên tiếng Việt)
          if (!/\n/.test(query) && query.length < 25) {
            setMentionQuery(query);
            setMentionOpen(true);
            setMentionAnchorEl(input);
            return;
          }
        }
      }
      setMentionOpen(false);
    },
    [inputRef]
  );

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      const input = inputRef.current;
      const pos = input?.selectionStart ?? text.length;
      const textBeforeCursor = text.slice(0, pos);
      const textAfterCursor = text.slice(pos);

      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const prefix = textBeforeCursor.slice(0, lastAtIndex);
        const tagText = candidate.isBot ? `@aura ` : `@[${candidate.name}](${candidate.id}) `;
        const newFullText = `${prefix}${tagText}${textAfterCursor}`;
        setText(newFullText);
        setMentionOpen(false);

        // Khôi phục con trỏ ngay sau thẻ mention vừa chèn
        setTimeout(() => {
          if (input) {
            const newPos = prefix.length + tagText.length;
            input.focus();
            input.setSelectionRange(newPos, newPos);
          }
        }, 15);
      }
    },
    [text, setText, inputRef]
  );

  return {
    mentionOpen,
    mentionQuery,
    mentionAnchorEl,
    checkMention,
    insertMention,
    closeMention: () => setMentionOpen(false),
  };
}

export default useMention;

