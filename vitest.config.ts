import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for V1.
 *
 * @remarks
 * V1 tests are domain-only (no UI tests).
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/domain/**/*.test.ts']
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
