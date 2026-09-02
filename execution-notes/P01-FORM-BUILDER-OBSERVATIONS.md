# P01 Payload Form Builder observations

Inspected the installed `@payloadcms/plugin-form-builder` 3.88.0 types and generated Forms/FormSubmissions collection seam while completing P01-T04. The plugin is useful as a storage/submission primitive, but its default customer-facing studio must be wrapped by the P06 Form Studio rather than exposed directly.

Controls to hide or deliberately omit from the LoreForge customer form experience:

- Email field and email-recipient configuration (`emailFrom`, `emailTo`, subject/body email templates): LoreForge form submissions create archive Documents and do not send generic form email.
- Confirmation type/message/redirect (`confirmationType`, `confirmationMessage`, redirect URL): LoreForge has its own post-submit archive result and should not expose a CMS redirect or arbitrary confirmation editor.
- Payment fields/charge handling: unrelated to civic archive intake and must not appear in the customer schema or renderer.
- Upload field/provider behavior: do not inherit arbitrary plugin upload MIME/storage behavior; P06 must apply the archive media boundary and explicit field policy.
- FormSubmissions admin collection terminology and CMS collection controls: internal Payload admin concepts stay behind the domain-language Form Studio and are not customer labels.
- Plugin email hooks (`beforeEmail`, `sendEmail`) and default recipient settings: leave disabled for the neutral form path unless a later, explicitly approved notification seam requires them.

Controls to retain/adapt in P06: stable field key/label/required/help metadata, text/textarea/select/radio/checkbox/date primitives, deterministic ordering, and a server-side submission seam that validates answers before document creation.
