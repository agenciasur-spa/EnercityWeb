import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Stub env vars so modules that import supabase at top level don't throw
vi.stubEnv('PUBLIC_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');