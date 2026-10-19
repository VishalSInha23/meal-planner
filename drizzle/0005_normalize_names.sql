UPDATE "dish" SET "name" = upper(left(cleaned, 1)) || substr(cleaned, 2)
FROM (
	SELECT "id", btrim(regexp_replace(regexp_replace("name", '[-–—]', ' ', 'g'), ' {2,}', ' ', 'g')) AS cleaned FROM "dish"
) AS normalized
WHERE "dish"."id" = normalized."id";
--> statement-breakpoint
UPDATE "ingredient" SET "name" = upper(left(cleaned, 1)) || substr(cleaned, 2)
FROM (
	SELECT "id", btrim(regexp_replace(regexp_replace("name", '[-–—]', ' ', 'g'), ' {2,}', ' ', 'g')) AS cleaned FROM "ingredient"
) AS normalized
WHERE "ingredient"."id" = normalized."id";
