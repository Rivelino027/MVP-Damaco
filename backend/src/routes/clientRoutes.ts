import { Router } from 'express';
import { getClients, getClientById, createClient, updateClient, deleteClient } from '../controllers/clientController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), createClient);
router.put('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), updateClient);
router.delete('/:id', requireRole(['OWNER', 'PROJECT_MANAGER', 'PM']), deleteClient);

export default router;
