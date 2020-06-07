export interface PasswordEntry {
    id: string;
    username: string;
    password: string;
    creationDate: Date;
    lastAccessDate: Date;
    title?: string;
    url?: string;
    notes?: string;
}