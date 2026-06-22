export default {
  async list(ctx) {
    try {
      const userIdRaw = String(ctx.query?.user_id || "").trim();
      const userId = Number(userIdRaw);

      if (!Number.isFinite(userId) || userId <= 0) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          error: "invalid_user_id",
        };
        return;
      }

      const rows = await strapi.db.connection.raw(
        `
        select
          boats.id,
          boats.document_id as "documentId",
          boats.title,
          boats.slug,
          boats.description,
          boats.boat_type,
          boats.vessel_type,
          boats.listing_type,
          boats.capacity,
          boats.length_m,
          boats.engine_hp,
          boats.currency,
          boats.price_per_hour,
          boats.price_per_day,
          boats.price_per_week,
          boats.deposit,
          boats.sale_price,
          boats.min_rental_hours,
          l.id as home_marina_id,
          l.name as home_marina_name,
          cover.url as cover_url,
          boats.timezone,
          true as booking_enabled,
          coalesce(boats.instant_booking, false) as instant_booking,
          boats.verified_listing,
          boats.featured_listing,
          boats.contacts_visible,
          boats.owner_phone,
          boats.owner_whatsapp,
          boats.owner_viber,
          boats.created_by_id,
          boats.owner_user_id,
          boats.updated_at,
          boats.created_at,
          boats.published_at
        from (
          select
            b.*,
            row_number() over (
              partition by coalesce(b.document_id, b.slug, b.id::text)
              order by b.id desc
            ) as rn
          from public.boats b
          where (
            b.owner_user_id = ?
            or b.created_by_id = ?
          )
        ) boats
        left join public.boats_home_marina_lnk bhml
          on bhml.boat_id = boats.id
        left join public.locations l
          on l.id = bhml.location_id
        left join lateral (
          select f.url
          from public.files_related_mph frm
          join public.files f
            on f.id = frm.file_id
          where frm.related_id = boats.id
            and frm.related_type = 'api::boat.boat'
            and frm.field = 'cover'
          order by frm."order" asc nulls last, frm.id asc
          limit 1
        ) cover on true
        where rn = 1
          and (
            boats.published_at is not null
            or boats.updated_at >= now() - interval '30 days'
          )
          and lower(coalesce(boats.title,'')) not like '%test%'
          and lower(coalesce(boats.title,'')) not like '%demo%'
          and lower(coalesce(boats.title,'')) not like '%draft%'
        order by
          boats.published_at desc nulls last,
          boats.updated_at desc,
          boats.id desc
        `,
        [userId, userId]
      );

      ctx.status = 200;
      ctx.body = {
        ok: true,
        user_id: userId,
        boats: rows?.rows || [],
      };
    } catch (e) {
      strapi.log.error(`OWNER_BOATS_BY_USER_ERROR ${e instanceof Error ? e.message : String(e)}`);

      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: "owner_boats_by_user_failed",
      };
    }
  },
};
