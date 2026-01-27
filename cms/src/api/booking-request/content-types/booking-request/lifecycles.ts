export default {
  async afterCreate(event: any) {
    const uid = "api::booking-request.booking-request";

    const result: any = event?.result;
    if (!result) return;

    const id = result.id;
    const documentId = result.documentId ?? result.document_id ?? null;
    const publishedAt = result.publishedAt ?? result.published_at ?? null;

    if (!documentId || !id) return;

    try {
      // Case A: We received PUBLISHED row -> delete any DRAFT siblings
      if (publishedAt) {
        const del = await strapi.db.query(uid).deleteMany({
          where: {
            documentId,
            publishedAt: null,
            id: { $ne: id },
          },
        });

        strapi.log.info(
          `BOOKING_REQUEST_DEDUP afterCreate published id=${id} documentId=${documentId} deleted=${del ?? 0}`
        );
        return;
      }

      // Case B: We received DRAFT row -> if a PUBLISHED sibling already exists, delete THIS draft
      const publishedSibling = await strapi.db.query(uid).findOne({
        where: {
          documentId,
          publishedAt: { $notNull: true },
        },
        select: ["id"],
      });

      if (publishedSibling?.id && publishedSibling.id !== id) {
        await strapi.db.query(uid).delete({
          where: { id },
        });

        strapi.log.info(
          `BOOKING_REQUEST_DEDUP afterCreate draft-deleted id=${id} documentId=${documentId} publishedSiblingId=${publishedSibling.id}`
        );
      }
    } catch (e) {
      strapi.log.error("BOOKING_REQUEST_DEDUP_AFTER_CREATE_FAILED", e);
    }
  },
};
