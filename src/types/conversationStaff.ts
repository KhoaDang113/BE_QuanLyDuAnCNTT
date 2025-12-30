export interface PopulatedUser {
  _id: string;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
}

export interface PopulatedAgent {
  _id: string;
  name: string;
}

export interface BaseConversation {
  _id: string;
  user_id: PopulatedUser;
  current_agent_id: PopulatedAgent;
  state?: string;
  last_message_at?: string | Date;
  last_message?: string;
  sender_type?: string;
  updatedAt?: string | Date;
}

export interface MessageDocumentLean {
  _id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  createdAt: string | Date;
  is_read: boolean;
}

export interface EnrichedConversation extends BaseConversation {
  last_message: string;
  sender_type: string;
  unread_count: number;
}
