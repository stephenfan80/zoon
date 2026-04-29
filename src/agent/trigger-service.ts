import type { Comment, CommentReply } from '../formats/provenance-sidecar';
import type { AgentResponse } from './types';
import { extractAgentMentions, hasAgentMention } from '../shared/agent-command-constants';

export interface TriggerEvent {
  type: 'comment' | 'inline';
  mentionText: string;
  position?: { from: number; to: number };
  commentId?: string;
  commentThread?: Comment[];
  timestamp: number;
}

export interface TriggerServiceCallbacks {
  onTrigger?: (event: TriggerEvent) => void;
  onAgentStart?: (_task: unknown) => void;
  onAgentComplete?: (_task: unknown, _response: AgentResponse) => void | Promise<void>;
  onError?: (error: Error, task?: unknown) => void;
}

export class TriggerService {
  private callbacks: TriggerServiceCallbacks = {};
  private documentContent = '';

  setCallbacks(callbacks: TriggerServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  updateDocumentContent(content: string): void {
    this.documentContent = content;
  }

  setCurrentUser(_user: string): void {
    // OSS default: embedded agent loop is disabled.
  }

  hasMention(text: string): boolean {
    return hasAgentMention(text);
  }

  extractMentions(text: string): { index: number; match: string }[] {
    return extractAgentMentions(text);
  }

  handleComment(_comment: Comment, _thread: Comment[]): void {}

  handleReply(_comment: Comment, _reply: CommentReply, _thread: Comment[]): void {}

  handleFreeformPrompt(prompt: string): void {
    this.callbacks.onTrigger?.({
      type: 'inline',
      mentionText: prompt,
      timestamp: Date.now(),
    });
  }

  handleAlwaysOnComment(_comment: Comment, _thread: Comment[]): void {}

  handleInlineMention(
    _position: { from: number; to: number },
    _surroundingText: string,
    _fullText: string,
  ): void {}

  getDocumentContent(): string {
    return this.documentContent;
  }
}

const triggerService = new TriggerService();

export function getTriggerService(): TriggerService {
  return triggerService;
}
