import { z } from 'zod';

/**
 * Standard API Response Schema
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    message: z.string().optional(),
    timestamp: z.string().optional(),
    request_id: z.string().optional(),
  });

/**
 * Item Schema
 */
export const ItemSchema = z.object({
  item_code: z.string(),
  item_name: z.string(),
  barcode: z.string().optional(),
  mrp: z.number().optional(),
  stock_qty: z.number().optional(),
  current_stock: z.number().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  uom_name: z.string().optional(),
  uom_code: z.string().optional(),
  uom: z.string().optional(),
  warehouse: z.string().optional(),
  image_url: z.string().optional(),
  description: z.string().optional(),
  sales_price: z.number().optional(),
  sale_price: z.number().optional(),
  manual_barcode: z.string().optional(),
  unit2_barcode: z.string().optional(),
  unit_m_barcode: z.string().optional(),
  batch_id: z.string().optional(),
});

/**
 * User Schema
 */
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  role: z.string(),
  permissions: z.array(z.string()).optional(),
});

/**
 * Login Response Schema
 */
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  user: UserSchema,
});

export type Item = z.infer<typeof ItemSchema>;
export type User = z.infer<typeof UserSchema>;
