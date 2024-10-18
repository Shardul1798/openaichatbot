import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { boolean } from 'zod';

export type SummaryDocument = Summary & Document;

// Define the schema for the summary object
const summarySchema = new mongoose.Schema({
  Age: { type: Number, required: true },
  Gender: { type: String, required: true },
  'Chief Complaint': {},
  'History of Present Illness': {},
  Allergies: {},
  'Past Medical History': {},
  Medications: {},
  'Social History': {},
  'Family History': {},
  'Vital Signs': {},
});

@Schema()
export class Summary {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: false, type: summarySchema })
  summary: Record<string, any>; // Or you can define an interface to better type the summary object

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: false, type: boolean })
  conversationClosed: boolean;

  @Prop({ default: 0, max: 10000 })
  utilisedTokens: number;

  @Prop({ required: false, type: String })
  encryptedIV: string;
}

export const SummarySchema = SchemaFactory.createForClass(Summary);
