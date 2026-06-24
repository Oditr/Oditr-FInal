import { createClient } from '@supabase/supabase-js'
import type { Client } from './types'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createClientRecord(data: Partial<Client>, userId: string): Promise<Client> {
  const db = getDb()
  const id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  const { data: client, error } = await db
    .from('clients')
    .insert({
      id,
      user_id: userId,
      client_name: data.clientName,
      company_name: data.companyName,
      website: data.website,
      industry: data.industry,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      notes: data.notes
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create client: ${error.message}`)

  return {
    id: client.id,
    userId: client.user_id,
    clientName: client.client_name,
    companyName: client.company_name,
    website: client.website,
    industry: client.industry,
    contactName: client.contact_name,
    contactEmail: client.contact_email,
    notes: client.notes,
    createdAt: client.created_at,
    updatedAt: client.updated_at
  }
}

export async function getClients(userId: string): Promise<Client[]> {
  const db = getDb()
  const { data, error } = await db
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`)

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    clientName: row.client_name,
    companyName: row.company_name,
    website: row.website,
    industry: row.industry,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function getClientById(id: string, userId: string): Promise<Client | null> {
  const db = getDb()
  const { data: row, error } = await db
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !row) return null

  return {
    id: row.id,
    userId: row.user_id,
    clientName: row.client_name,
    companyName: row.company_name,
    website: row.website,
    industry: row.industry,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function updateClient(id: string, userId: string, data: Partial<Client>): Promise<Client> {
  const db = getDb()
  const payload: any = { updated_at: new Date().toISOString() }
  
  if (data.clientName !== undefined) payload.client_name = data.clientName
  if (data.companyName !== undefined) payload.company_name = data.companyName
  if (data.website !== undefined) payload.website = data.website
  if (data.industry !== undefined) payload.industry = data.industry
  if (data.contactName !== undefined) payload.contact_name = data.contactName
  if (data.contactEmail !== undefined) payload.contact_email = data.contactEmail
  if (data.notes !== undefined) payload.notes = data.notes

  const { data: client, error } = await db
    .from('clients')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update client: ${error.message}`)

  return {
    id: client.id,
    userId: client.user_id,
    clientName: client.client_name,
    companyName: client.company_name,
    website: client.website,
    industry: client.industry,
    contactName: client.contact_name,
    contactEmail: client.contact_email,
    notes: client.notes,
    createdAt: client.created_at,
    updatedAt: client.updated_at
  }
}

export async function deleteClient(id: string, userId: string): Promise<void> {
  const db = getDb()
  const { error } = await db
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete client: ${error.message}`)
}
