"use client";

export interface Contact {
  id: string;
  label: string;
  address: string;
  handle?: string;
  createdAt: number;
}

const STORAGE_KEY = "dpi_saved_contacts";

export function getSavedContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveContact(contact: Omit<Contact, "id" | "createdAt">): Contact {
  const contacts = getSavedContacts();
  const newContact: Contact = {
    ...contact,
    id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };

  // Prevent duplicate addresses, update if exists
  const existingIdx = contacts.findIndex((c) => c.address === contact.address);
  let updated: Contact[];
  if (existingIdx >= 0) {
    contacts[existingIdx] = { ...contacts[existingIdx], ...contact };
    updated = [...contacts];
  } else {
    updated = [newContact, ...contacts];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return newContact;
}

export function deleteContact(id: string): void {
  const contacts = getSavedContacts();
  const filtered = contacts.filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function updateContact(id: string, updates: Partial<Omit<Contact, "id" | "createdAt">>): void {
  const contacts = getSavedContacts();
  const updated = contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
