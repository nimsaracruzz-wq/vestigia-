-- Preserve every section and existing edit. Add focal controls to the hero only.
UPDATE "Homepage" SET "draft" = json_set("draft", '$.sections', json((
 SELECT json_group_array(json(CASE WHEN json_extract(value,'$.type')='hero'
 THEN json_set(value,'$.settings',json(json_patch(
 '{"desktopFocalX":50,"desktopFocalY":0,"tabletFocalX":50,"tabletFocalY":0,"mobileFocalX":50,"mobileFocalY":50}',json_extract(value,'$.settings'))))
 ELSE value END)) FROM json_each("Homepage"."draft",'$.sections')
)));
UPDATE "Homepage" SET "published" = json_set("published", '$.sections', json((
 SELECT json_group_array(json(CASE WHEN json_extract(value,'$.type')='hero'
 THEN json_set(value,'$.settings',json(json_patch(
 '{"desktopFocalX":50,"desktopFocalY":0,"tabletFocalX":50,"tabletFocalY":0,"mobileFocalX":50,"mobileFocalY":50}',json_extract(value,'$.settings'))))
 ELSE value END)) FROM json_each("Homepage"."published",'$.sections')
)));
