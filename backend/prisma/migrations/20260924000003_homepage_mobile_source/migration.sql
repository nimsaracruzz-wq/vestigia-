-- Pin the existing mobile composition when upgrading the bundled campaign.
-- Custom hero images and explicit mobile choices remain unchanged.
UPDATE "Homepage" SET "draft" = json_set("draft", '$.sections', json((
 SELECT json_group_array(json(CASE WHEN json_extract(value,'$.type')='hero'
 AND json_extract(value,'$.settings.image')='/images/products/vestigia-hero-1254.jpg'
 AND coalesce(json_extract(value,'$.settings.mobileImage'),'')=''
 THEN json_set(value,'$.settings.mobileImage','/images/products/vestigia-hero-768.jpg')
 ELSE value END)) FROM json_each("Homepage"."draft",'$.sections')
)));
UPDATE "Homepage" SET "published" = json_set("published", '$.sections', json((
 SELECT json_group_array(json(CASE WHEN json_extract(value,'$.type')='hero'
 AND json_extract(value,'$.settings.image')='/images/products/vestigia-hero-1254.jpg'
 AND coalesce(json_extract(value,'$.settings.mobileImage'),'')=''
 THEN json_set(value,'$.settings.mobileImage','/images/products/vestigia-hero-768.jpg')
 ELSE value END)) FROM json_each("Homepage"."published",'$.sections')
)));
UPDATE "Homepage" SET "revision"="revision"+1, "publishedRevision"="publishedRevision"+1;
