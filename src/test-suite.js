/**
 * VALIDATION SUITE - TDE Group
 * Test all services before UI implementation
 * 
 * Usage: Open browser console and run:
 * - testAuthService()
 * - testDataStore()
 * - testChatService()
 */

import { supabase } from './supabase-client.js';
import authService from './auth-service.js';
import projectStore from './data-store.js';
import chatService from './chat-service.js';

// ===== INITIALIZE SERVICES =====
// Services are already initialized in their modules
async function initializeServices() {
    try {
        // Wait for auth to be ready
        if (authService.authReady) {
            await authService.authReady;
        }
        
        window.authService = authService;
        window.projectStore = projectStore;
        window.chatService = chatService;
        
        console.log('✅ Services loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Error loading services:', error);
        return false;
    }
}

// Auto-initialize
initializeServices();

console.log('✅ Services initialized. Ready to test.');

// ===== TEST HELPER FUNCTIONS =====

function log(title, message, type = 'info') {
    const styles = {
        success: 'color: #22c55e; font-weight: bold;',
        error: 'color: #ef4444; font-weight: bold;',
        warning: 'color: #f59e0b; font-weight: bold;',
        info: 'color: #3b82f6; font-weight: bold;'
    };
    console.log(`%c[${title}] ${message}`, styles[type]);
}

async function testResult(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}`);
    if (details) console.log(`   📝 ${details}`);
}

// ===== TEST 1: AUTHENTICATION SERVICE =====

async function testAuthService() {
    console.clear();
    log('AUTH SERVICE TESTS', 'Starting validation...', 'info');
    console.log('');

    try {
        // TEST 1.1: Check if service initialized
        log('TEST 1.1', 'Service initialization', 'info');
        const authReady = await window.authService.authReady;
        await testResult('Auth service ready', authReady === true, 'Service properly initialized');

        // TEST 1.2: Check current session
        log('TEST 1.2', 'Check current session', 'info');
        const { data: { session } } = await supabase.auth.getSession();
        await testResult('Session exists', session !== null, session ? `User: ${session.user.email}` : 'No session');

        // TEST 1.3: Test logout & login
        log('TEST 1.3', 'Test logout function', 'info');
        if (session) {
            await window.authService.logout();
            const { data: { session: newSession } } = await supabase.auth.getSession();
            await testResult('Logout works', newSession === null, 'Session cleared');
        }

        log('TEST 1.3B', 'Test login (MANUAL)', 'warning');
        console.log('   👉 You need to test login manually:');
        console.log('      authService.loginAdmin("admin@example.com", "password")');

        // TEST 1.4: Profile loading
        log('TEST 1.4', 'Profile loading capability', 'info');
        const hasLoadProfile = typeof window.authService._loadUserProfile === 'function';
        await testResult('Profile loader exists', hasLoadProfile, '_loadUserProfile method found');

    } catch (error) {
        log('ERROR', error.message, 'error');
    }

    console.log('');
    console.log('%c━━━ END AUTH TESTS ━━━', 'color: #3b82f6; font-weight: bold;');
}

// ===== TEST 2: DATA STORE SERVICE =====

async function testDataStore() {
    console.clear();
    log('DATA STORE TESTS', 'Starting validation...', 'info');
    console.log('');

    try {
        // TEST 2.1: Get all projects
        log('TEST 2.1', 'Fetch all projects', 'info');
        const projects = await window.projectStore.getAll();
        await testResult('getAll() works', Array.isArray(projects), `Found ${projects.length} projects`);

        // TEST 2.2: Check projects have required fields
        if (projects.length > 0) {
            log('TEST 2.2', 'Check project schema', 'info');
            const project = projects[0];
            const requiredFields = ['id', 'name', 'description', 'status'];
            const hasAllFields = requiredFields.every(field => field in project);
            await testResult('Project schema valid', hasAllFields, `Fields: ${Object.keys(project).join(', ')}`);

            // TEST 2.3: Get project by ID
            log('TEST 2.3', `Fetch project by ID (${project.id})`, 'info');
            const singleProject = await window.projectStore.getById(project.id);
            await testResult('getById() works', singleProject !== null, `Retrieved: ${singleProject?.name}`);

            // TEST 2.4: Get phases
            log('TEST 2.4', 'Fetch project phases', 'info');
            const phases = await window.projectStore.getPhases(project.id);
            await testResult('getPhases() works', Array.isArray(phases), `Found ${phases.length} phases`);

            // TEST 2.5: Get documents
            log('TEST 2.5', 'Fetch project documents', 'info');
            const documents = await window.projectStore.getImages(project.id);
            await testResult('getImages() works', Array.isArray(documents), `Found ${documents.length} documents`);
        } else {
            log('WARNING', 'No projects found - skipping detail tests', 'warning');
        }

    } catch (error) {
        log('ERROR', error.message, 'error');
    }

    console.log('');
    console.log('%c━━━ END DATA STORE TESTS ━━━', 'color: #3b82f6; font-weight: bold;');
}

// ===== TEST 3: CHAT SERVICE =====

async function testChatService() {
    console.clear();
    log('CHAT SERVICE TESTS', 'Starting validation...', 'info');
    console.log('');

    try {
        // TEST 3.1: Get all conversations
        log('TEST 3.1', 'Fetch all conversations', 'info');
        const conversations = await window.chatService.getAllConversations();
        await testResult('getAllConversations() works', Array.isArray(conversations), `Found ${conversations.length} conversations`);

        // TEST 3.2: Check Realtime subscription capability
        log('TEST 3.2', 'Check Realtime capability', 'info');
        const hasSubscribe = typeof window.chatService.subscribeToProject === 'function';
        await testResult('Realtime subscription available', hasSubscribe, 'subscribeToProject method exists');

        // TEST 3.3: Message schema
        if (conversations.length > 0) {
            log('TEST 3.3', 'Check message schema', 'info');
            const message = conversations[0];
            const requiredFields = ['id', 'content', 'sender_role', 'sender_name'];
            const hasAllFields = requiredFields.every(field => field in message);
            await testResult('Message schema valid', hasAllFields, `Fields: ${Object.keys(message).join(', ')}`);
        }

    } catch (error) {
        log('ERROR', error.message, 'error');
    }

    console.log('');
    console.log('%c━━━ END CHAT SERVICE TESTS ━━━', 'color: #3b82f6; font-weight: bold;');
}

// ===== TEST 4: DATABASE CONNECTIVITY =====

async function testDatabaseConnection() {
    console.clear();
    log('DATABASE TESTS', 'Starting validation...', 'info');
    console.log('');

    try {
        // TEST 4.1: Supabase connection
        log('TEST 4.1', 'Supabase connectivity', 'info');
        const { data, error } = await supabase.from('projects').select('count', { count: 'exact' });
        await testResult('Database connected', !error, error ? error.message : 'Connection OK');

        // TEST 4.2: Check tables exist
        log('TEST 4.2', 'Check tables exist', 'info');
        const tables = ['projects', 'profiles', 'messages', 'tickets', 'phases', 'documents'];
        for (const table of tables) {
            const { error } = await supabase.from(table).select('count', { count: 'exact' }).limit(1);
            const tableOk = !error;
            console.log(`   ${tableOk ? '✅' : '❌'} ${table}`);
        }

    } catch (error) {
        log('ERROR', error.message, 'error');
    }

    console.log('');
    console.log('%c━━━ END DATABASE TESTS ━━━', 'color: #3b82f6; font-weight: bold;');
}

// ===== TEST 5: RLS POLICY VALIDATION =====

async function testRLSPolicies() {
    console.clear();
    log('RLS POLICY TESTS', 'Starting validation...', 'info');
    console.log('');

    try {
        // TEST 5.1: Admin should see all projects
        log('TEST 5.1', 'Admin RLS: Can see all projects', 'info');
        const { data: adminProjects, error: adminError } = await supabase
            .from('projects')
            .select('id, name')
            .limit(5);
        await testResult('Admin access works', !adminError, adminError ? adminError.message : `Can fetch projects`);

        // TEST 5.2: Check RLS policies exist
        log('TEST 5.2', 'RLS policies defined', 'warning');
        console.log('   📝 RLS policies must be tested via:');
        console.log('      1. Admin login (should see all)');
        console.log('      2. Client login (should see only own)');
        console.log('      3. Anon access (should be denied)');

    } catch (error) {
        log('ERROR', error.message, 'error');
    }

    console.log('');
    console.log('%c━━━ END RLS TESTS ━━━', 'color: #3b82f6; font-weight: bold;');
}

// ===== COMPLETE TEST SUITE =====

async function runAllTests() {
    console.clear();
    console.log('%c╔════════════════════════════════════════════════════════╗', 'color: #3b82f6; font-weight: bold;');
    console.log('%c║         TDE GROUP - COMPLETE VALIDATION SUITE         ║', 'color: #3b82f6; font-weight: bold;');
    console.log('%c║                Start: ' + new Date().toLocaleString() + '               ║', 'color: #3b82f6; font-weight: bold;');
    console.log('%c╚════════════════════════════════════════════════════════╝', 'color: #3b82f6; font-weight: bold;');
    console.log('');

    await testAuthService();
    console.log('');
    await testDatabaseConnection();
    console.log('');
    await testDataStore();
    console.log('');
    await testChatService();
    console.log('');
    await testRLSPolicies();

    console.log('');
    console.log('%c╔════════════════════════════════════════════════════════╗', 'color: #22c55e; font-weight: bold;');
    console.log('%c║                   TEST SUITE COMPLETE                 ║', 'color: #22c55e; font-weight: bold;');
    console.log('%c║              Next: Create Admin & Client pages         ║', 'color: #22c55e; font-weight: bold;');
    console.log('%c╚════════════════════════════════════════════════════════╝', 'color: #22c55e; font-weight: bold;');
}

// Export for manual testing
window.runAllTests = runAllTests;
window.testAuthService = testAuthService;
window.testDataStore = testDataStore;
window.testChatService = testChatService;
window.testDatabaseConnection = testDatabaseConnection;
window.testRLSPolicies = testRLSPolicies;

console.log('%c🧪 Test functions available:', 'color: #3b82f6; font-weight: bold;');
console.log('   runAllTests()');
console.log('   testAuthService()');
console.log('   testDataStore()');
console.log('   testChatService()');
console.log('   testDatabaseConnection()');
console.log('   testRLSPolicies()');
