import { Router } from 'express';
import { 
  getEvents, 
  getEventById, 
  createEvent, 
  updateEventDetails,
  updateEventStatus,
  toggleEventVisibility,
  updateEventForm,
  deleteEvent
} from '../controllers/event.controller.js';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.put('/:id', updateEventDetails);
router.patch('/:id/status', updateEventStatus);
router.patch('/:id/visibility', toggleEventVisibility);
router.put('/:id/form', updateEventForm);
router.delete('/:id', deleteEvent);

export default router;
