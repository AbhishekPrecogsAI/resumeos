import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { expectedRevision, setRevisionHeader } from '../../utils/revision.js';
import { ID_PATTERN } from '@resumeos/shared/ids.js';
import { PROFILE_SECTIONS } from './content.schema.js';
import { profileService } from './profile.service.js';

const sectionParam = z.strictObject({ section: z.enum(PROFILE_SECTIONS) });
const entryParams = z.strictObject({
  section: z.enum(PROFILE_SECTIONS),
  entryId: z.string().regex(ID_PATTERN),
});
// Content is validated in full by the service; here we only check the envelope.
const replaceBody = z.strictObject({ content: z.record(z.string(), z.unknown()) });
const addBody = z.strictObject({
  entry: z.record(z.string(), z.unknown()),
  position: z.enum(['start', 'end']).optional(),
});
const patchBody = z.strictObject({
  changes: z.record(z.string(), z.unknown()).refine((c) => !('id' in c), 'id cannot change.'),
});

export function profileRouter() {
  const router = Router();
  router.use(requireAuth);

  const send = (res, dto, status = 200, extra = {}) => {
    setRevisionHeader(res, dto.revision);
    res.status(status).json({
      profile: { revision: dto.revision, content: dto.content, updatedAt: dto.updatedAt },
      ...extra,
    });
  };

  router.get(
    '/',
    route(async (req, res) => send(res, await profileService.get(req.auth.user._id))),
  );

  router.put(
    '/',
    validate({ body: replaceBody }),
    route(async (req, res) => {
      const dto = await profileService.replace(
        req.auth.user._id,
        expectedRevision(req),
        req.valid.body.content,
      );
      send(res, dto);
    }),
  );

  router.post(
    '/:section',
    validate({ params: sectionParam, body: addBody }),
    route(async (req, res) => {
      const { entry, ...dto } = await profileService.addEntry(
        req.auth.user._id,
        expectedRevision(req),
        req.valid.params.section,
        req.valid.body.entry,
        { position: req.valid.body.position },
      );
      send(res, dto, 201, { entry });
    }),
  );

  router.patch(
    '/:section/:entryId',
    validate({ params: entryParams, body: patchBody }),
    route(async (req, res) => {
      const { section, entryId } = req.valid.params;
      const { entry, ...dto } = await profileService.updateEntry(
        req.auth.user._id,
        expectedRevision(req),
        section,
        entryId,
        req.valid.body.changes,
      );
      send(res, dto, 200, { entry });
    }),
  );

  router.delete(
    '/:section/:entryId',
    validate({ params: entryParams }),
    route(async (req, res) => {
      const { section, entryId } = req.valid.params;
      send(
        res,
        await profileService.deleteEntry(
          req.auth.user._id,
          expectedRevision(req),
          section,
          entryId,
        ),
      );
    }),
  );

  return router;
}
