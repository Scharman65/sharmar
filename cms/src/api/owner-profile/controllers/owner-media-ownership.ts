import {
  isOwnerInternalAuthorized,
} from "../../../utils/ownerInternalAuth";

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function fileIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter(
          (item) =>
            Number.isInteger(item) &&
            item > 0
        )
    )
  );
}

function fail(
  ctx: any,
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  ctx.status = status;
  ctx.body = {
    ok: false,
    error,
    ...(extra || {}),
  };
}

let tableReady: Promise<void> | null = null;

async function ensureTable() {
  tableReady ??= strapi.db.connection
    .raw(`
      create table if not exists
        public.owner_media_files (
          user_id integer not null,
          file_id integer not null,
          purpose text not null
            default 'owner_upload',
          created_at timestamptz not null
            default now(),
          primary key (user_id, file_id)
        );

      create unique index if not exists
        owner_media_files_file_id_unique
      on public.owner_media_files(file_id);
    `)
    .then(() => undefined);

  await tableReady;
}

export default {
  async register(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) {
      return fail(ctx, 401, "unauthorized");
    }

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const ids = fileIds(body.file_ids);
    const purpose =
      cleanString(body.purpose) ||
      "owner_upload";

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      ids.length === 0 ||
      ids.length > 20
    ) {
      return fail(
        ctx,
        400,
        "invalid_media_registration"
      );
    }

    await ensureTable();

    const existingRows =
      await strapi.db.connection.raw(
        `
        select file_id, user_id
        from public.owner_media_files
        where file_id = any(?::int[])
        `,
        [ids]
      );

    const foreign = (
      existingRows?.rows || []
    )
      .filter(
        (row) =>
          Number(row.user_id) !== userId
      )
      .map((row) => Number(row.file_id));

    if (foreign.length > 0) {
      return fail(
        ctx,
        409,
        "media_owned_by_other_owner",
        {
          conflicting_file_ids: foreign,
        }
      );
    }

    await strapi.db.connection.transaction(
      async (trx) => {
        for (const id of ids) {
          const result = await trx.raw(
            `
            insert into
              public.owner_media_files(
                user_id,
                file_id,
                purpose,
                created_at
              )
            values (?, ?, ?, now())
            on conflict (file_id)
            do update set
              purpose = excluded.purpose
            where
              owner_media_files.user_id =
              excluded.user_id
            returning file_id
            `,
            [userId, id, purpose]
          );

          if (!result?.rows?.length) {
            throw new Error(
              "media_owned_by_other_owner"
            );
          }
        }
      }
    );

    ctx.body = {
      ok: true,
      file_ids: ids,
    };
  },

  async verify(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) {
      return fail(ctx, 401, "unauthorized");
    }

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const ids = fileIds(body.file_ids);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      ids.length === 0 ||
      ids.length > 30
    ) {
      return fail(
        ctx,
        400,
        "invalid_media_verification"
      );
    }

    await ensureTable();

    const rows =
      await strapi.db.connection.raw(
        `
        select file_id
        from public.owner_media_files
        where
          user_id = ?
          and file_id = any(?::int[])
        `,
        [userId, ids]
      );

    const found = new Set(
      (rows?.rows || [])
        .map((row) => Number(row.file_id))
        .filter(
          (id) => Number.isInteger(id)
        )
    );

    const missing = ids.filter(
      (id) => !found.has(id)
    );

    if (missing.length > 0) {
      return fail(
        ctx,
        403,
        "media_not_owned_by_owner",
        {
          missing_file_ids: missing,
        }
      );
    }

    ctx.body = {
      ok: true,
      file_ids: ids,
    };
  },
};
