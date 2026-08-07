import { Router } from 'express';
import { 
  getEvents, 
  getEventById, 
  createEvent, 
  updateEventStatus, 
  updateEventForm 
} from '../controllers/event.controller.js';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.patch('/:id/status', updateEventStatus);
router.put('/:id/form', updateEventForm);

export default router;
