# Spike Source Manifest

**Purpose:** let a clean-context reviewer verify exactly what was reviewed and understand the completed MVP without treating it as permanent architecture.

- Original submitted archive: `sl-civic-archive-mvp-source.zip`
- SHA-256: `ebad95139560a6de786e7698cfd49e6bf195bcb26108f38dc2b5ee40c7e0db2e`
- The archive contains the runnable spike source plus the original MVP build packet.
- `SPIKE_MVP_REVIEW.md` is the executor-authored end-of-spike review. Its reported acceptance pass is evidence from that executor, not an independent rerun by this packet.
- `04_SPIKE_BASELINE.md` is the authoritative interpretation of what the spike proves and what remains temporary.

## Reviewer's minimum source-level checks
- Confirm canonical Markdown is stored as Markdown and normalized at boundaries.
- Confirm current renderer uses Marked without sanitization; P01-T01 intentionally fixes this before untrusted use.
- Confirm tenant scoping in the spike is application-query based and not mistaken for final authorization.
- Confirm Form Builder output flows through the small generation seam rather than directly defining permanent Document schema.
- Confirm SQLite/local media are deliberate spike infrastructure.

## Files in submitted archive

| Path | Bytes | SHA-256 |
|---|---:|---|
| `sl-civic-archive-mvp-packet/00_BUILD_SPEC.md` | 20876 | `0b6b156386345f8823a97ddae95bc6a579dba56e7b8990f962ed460cebb49285` |
| `sl-civic-archive-mvp-packet/01_EXECUTION_STACK.md` | 16949 | `787a7dcf23cfb91f10b6bd86f35c6ff0cf9a104b1a0e1fdb1ee87ec2c8a3dfc5` |
| `sl-civic-archive-mvp-packet/02_TEST_FIXTURES.md` | 6761 | `2379376823c00fe8a03da11ade128cbca8ba7a4b8120e105e6a618eabb9612a6` |
| `sl-civic-archive-mvp-packet/README.md` | 1352 | `d23bfe28e17933fcb5ec20e63aca4df0446426bca1a6cee7e8cec98640a016f1` |
| `sl-civic-archive/MVP_REVIEW.md` | 4096 | `df0e6d6095fa162454274af70b15723ec2882f7a0beed10cfc908fc56d393e5c` |
| `sl-civic-archive/README.md` | 6582 | `a27ddc9ebdd1e49e4bc27393dec605d4970bcd90ce964ec939a56cf3cd3317ca` |
| `sl-civic-archive/eslint.config.mjs` | 302 | `1f91c2366c525f5b190ac31aa451297ea9dc29bb71bbf6751acf75e258ff8bd0` |
| `sl-civic-archive/next.config.ts` | 388 | `879da4f63a00182e6448e6f9df8e1e94599d0d251624aeb1c352f6338a5cc2ac` |
| `sl-civic-archive/package-lock.json` | 546887 | `c60d95e3a71954e83a10b40022fc8d6739bf4f62e67773fa2538bec1efd08bed` |
| `sl-civic-archive/package.json` | 1367 | `5b36c2fcdce72d2c8c9208796d2a80d789002200e3a5dd284ce697d0f785eee1` |
| `sl-civic-archive/src/app/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(frontend)/custom.scss` | 395 | `6a28e8ebdb85728bbac444cd4d9f6a511b68c97d9b94e12ceaf94877fe4e3b3c` |
| `sl-civic-archive/src/app/(frontend)/layout.tsx` | 446 | `0623a416aaadd7f61355bffdb1067b8285ebdd91553587de2c89642573497c13` |
| `sl-civic-archive/src/app/(frontend)/page.tsx` | 2527 | `f3372eb5910312ec3dd536271b7ada0ee7b53073690908b8d7d53becc83a9384` |
| `sl-civic-archive/src/app/(frontend)/tenant/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/about/about.module.scss` | 1255 | `bbff47326642831d11f28d98831c13a035b440ea60831ecf8dffd2ab985a6273` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/about/page.tsx` | 1566 | `ed6478ca0a9683fa2291cc913c48ce451e1e93bb4e3eb69efcebeb6ebf8bb1b7` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/customize/page.tsx` | 2515 | `ac615c82b9092384a3a59f586a0886dce7a4106f9d5e15318bce2a05b55b3726` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/departments/departments.module.scss` | 1003 | `8401fd5d57070de92bef5959aa8b122d8b7ad1590b3f02cfad103cbc66efd705` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/departments/page.tsx` | 1824 | `555828a482c6de93b8df3e4042f7061d076fa93a566f9e5c352fbaa97c6daa7f` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/documents/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/documents/[id]/document.module.scss` | 3566 | `ca2c9820aaaad71f1ea5de278115b9f2bb3cb1227676fc477565b8b8fe5ad562` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/documents/[id]/edit/page.tsx` | 1412 | `82725b884e28eb7c2d6650fae3e2d09b091e7d267d3a7b22104cc8e5b9b8dd5b` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/documents/[id]/page.tsx` | 4998 | `fe5a33bf61836e5b964535e8931ecf46926672196c81f446a67e13d3476400d4` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/forms/[formId]/fill.module.scss` | 565 | `eb2a47a2953135ccf8e33c747969f4f27ad00d29387d6a945a8b8806904f45f2` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/forms/[formId]/page.tsx` | 3010 | `53d32517d4e80184ec207779878a29f8de68688865614ae354d15531934069e6` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/forms/forms.module.scss` | 1118 | `2fa51b122a52a7c4607b2065659d891fac8520bd7d395bfc98d487e241166a8b` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/forms/page.tsx` | 2001 | `ee1a4248f15be5768c6ecfd1720a59b0fea3c5ca9f8374b5647f02698392ce6b` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/home.module.scss` | 2762 | `97b1d3e587efab3126adc38507f9a06631dd0774d36e7261e301a40555001ea0` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/import/import.module.scss` | 1392 | `f3ffad8606d77bbac19e1fab4a1131fdee551f90e566b8fcd47a7774602a77f8` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/import/page.tsx` | 4157 | `286b1e385fc3c57d12bd89c9f11882b67817ccebd239cf09693b13db820b8f14` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/page.tsx` | 3387 | `7dd27c026f5f933198fb226d03a00c817ad8ad667a4182b9e1e12339809dcb60` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/pages/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/pages/[pageSlug]/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/pages/[pageSlug]/edit/page.tsx` | 1419 | `cad7edda7decab530ee139b5bb48ef9f5b45fc45ff36de22125d21371f76b070` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/records/page.tsx` | 8525 | `afa1d92b5dd66dfaf088015722bc5f0bf082087646af1b632950773101874ecb` |
| `sl-civic-archive/src/app/(frontend)/tenant/[slug]/records/records.module.scss` | 4781 | `05521dfdcaa30c93fb35a7926356c431906d3fad8da81ef9a31536f1fb2dd61c` |
| `sl-civic-archive/src/app/(payload)/admin/[...segments]/not-found.tsx` | 741 | `3f8c11444e6c560884d57a9ed5c48ce378b3bb397821e0c801570eec2f7f91fa` |
| `sl-civic-archive/src/app/(payload)/admin/[[...segments]]/page.tsx` | 741 | `3f8c11444e6c560884d57a9ed5c48ce378b3bb397821e0c801570eec2f7f91fa` |
| `sl-civic-archive/src/app/(payload)/admin/importMap.js` | 6190 | `12019b38da3b5976d953ee359f7bf15f7ddf60d8d4debf9188798d88b6b2bf1f` |
| `sl-civic-archive/src/app/(payload)/api/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/app/(payload)/api/[...slug]/route.ts` | 473 | `4e6a1380a3647f75a3765452d352b944c9800ad517328b61f81d029ca355f1a3` |
| `sl-civic-archive/src/app/(payload)/api/graphql-playground/route.ts` | 363 | `ab0d8ea9339017d5872fd0680157d168241449d3abef91978165dfe82b20ef36` |
| `sl-civic-archive/src/app/(payload)/api/graphql/route.ts` | 344 | `d0c786c5a58bdf5a4fa45b469109698c9ffd5643df35159014c1f9db8f3f84d5` |
| `sl-civic-archive/src/app/(payload)/api/switch-tenant/route.ts` | 1436 | `5914160dbec03e994030f2d048a018e3a4b97c4a32b98274f95745a1fe64b00d` |
| `sl-civic-archive/src/app/(payload)/custom.scss` | 68 | `8ba44c35b1da18b00c1eb1abd41bb7533af661d62ba7e46816a5487ee41839c3` |
| `sl-civic-archive/src/app/(payload)/layout.tsx` | 851 | `85120154f6a39012732e7229ac3f2390d9d6e60c7610bda7a22f6c4d145d10c9` |
| `sl-civic-archive/src/collections/Documents.ts` | 1422 | `f3b5c1d6413dbda3d45966f8d4841e2bc3ec5cd915cb9d6afcdaaf8257ff361a` |
| `sl-civic-archive/src/collections/Folders.ts` | 1002 | `db759027c80aa5cc86e800e54134893db50b7f0a2e390adda5c6a8cdde37c5b7` |
| `sl-civic-archive/src/collections/Media.ts` | 1001 | `e8c62695744f09ca73431b2bdafa455e80e97a4087ce7e1e21867ff2542d0151` |
| `sl-civic-archive/src/collections/Memberships.ts` | 706 | `80743e1383070c316bb72f91e440f089e29e455b9b9ca01dc7cbf9e7dd156690` |
| `sl-civic-archive/src/collections/Pages.ts` | 1283 | `f5f2060804a9ea258ee2847ea52247cd485d9a9b6932134e665ce4ade9c918b8` |
| `sl-civic-archive/src/collections/Tenants.ts` | 3175 | `f7def33261f33cbee0563e06bff27e9580a86e24570bbe9b57c3f1454f968302` |
| `sl-civic-archive/src/collections/Users.ts` | 301 | `1f66d875525c6ebb7670cf4568613ac72474debaf032aa546f098776458f427c` |
| `sl-civic-archive/src/components/` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `sl-civic-archive/src/components/archive/CopyMarkdownButton.module.scss` | 324 | `cc120c9ce13accaac036c0a8f7490a08bb2281e8ddec4c8f44b2820d3aec979c` |
| `sl-civic-archive/src/components/archive/CopyMarkdownButton.tsx` | 634 | `4c50d89c260d2722b5c4f2056e53db572c19c85c457fb3062e41e82bcfac3de0` |
| `sl-civic-archive/src/components/archive/DeleteFolderButton.module.scss` | 491 | `ed779748f2a6eb81556032258def7c0ab9ba6c10d6f81c148ad05f6748dea30f` |
| `sl-civic-archive/src/components/archive/DeleteFolderButton.tsx` | 884 | `6af934e3b0c6e796afcf60d6775f6bf5264822a5fa9601129c0baeff041730f9` |
| `sl-civic-archive/src/components/archive/ImportSampleButton.module.scss` | 299 | `600538faebf37bdf492dd4014af7f14899114b89fa5bd98cb7c6db698dbd3430` |
| `sl-civic-archive/src/components/archive/ImportSampleButton.tsx` | 939 | `b7f6466a9cdec3f7d361d8795b11dfd36f731885e81506c53f05e44ed2e007db` |
| `sl-civic-archive/src/components/editor/DocumentEditor.module.scss` | 2125 | `4679d24aae7b680db619bcb7a3a656986183d2f6c598d018d639aa174ba9f7ee` |
| `sl-civic-archive/src/components/editor/DocumentEditor.tsx` | 4359 | `e519cf5daebb3a80731f059232fa9803782c380ae808d3febc3d065d285861df` |
| `sl-civic-archive/src/components/editor/ForwardRefEditor.tsx` | 661 | `258cdd7a465f355484a484e1a8f0b85d61b2649f076330759bab1cb4aa4dabec` |
| `sl-civic-archive/src/components/editor/InitializedMDXEditor.tsx` | 1773 | `1b3b47d00b337e8173c847311f747d51139f0381c66b30c3b6ce225f81919bfc` |
| `sl-civic-archive/src/components/forms/FillForm.module.scss` | 1220 | `1e6088f951b74f73426b85d470bb12cf4dd393af5ddbed5710078ac4ce2a8d08` |
| `sl-civic-archive/src/components/forms/FillForm.tsx` | 3658 | `3a5a96d83d94aea41fd98a764c0989494f64b990ed3ae8b756ddcfddb66b412b` |
| `sl-civic-archive/src/components/theme/TenantShell.module.scss` | 2185 | `5bb07dd7197b63fe8168afa92ee713c8c87c9e3a7cf6141c5b3df728563ed333` |
| `sl-civic-archive/src/components/theme/TenantShell.tsx` | 3456 | `6090e119c2f8126d7a84ec90cc85c02281414ec9fa2e03033be4cf131f371d84` |
| `sl-civic-archive/src/components/theme/ThemeStudio.module.scss` | 4431 | `8121d28378acde9e1aaaf9ad87adff2fbc068af3b62a190f9ea7299d398add4a` |
| `sl-civic-archive/src/components/theme/ThemeStudio.tsx` | 8396 | `06582b2cf5406a4017682fe7014846802fb44fa27eed2436ffae5d1268de29fa` |
| `sl-civic-archive/src/lib/actions/archive.ts` | 7575 | `a9bd8417678b27ddea4155bff2d1f97aa9ad3fd5b5968f63943c2e4586c547b8` |
| `sl-civic-archive/src/lib/actions/forms.ts` | 3685 | `79c5f01d8237f59d34a1324f305a10e42f3f105400bad00ebb27ab81685b3d89` |
| `sl-civic-archive/src/lib/actions/saveDocument.ts` | 2059 | `978d03d0a829fd9cb5f08a7a10fdbb7b1a50e5be37493846ec14d731bac76938` |
| `sl-civic-archive/src/lib/actions/savePage.ts` | 1941 | `36b9602da46fc79be24175e2c79b1ca24cdd6bd979c1d1fff5b9685ad668694d` |
| `sl-civic-archive/src/lib/actions/saveTheme.ts` | 2040 | `46a5da1d4fda18cdcb5d1b42d4f630004481d393ae64450f74446a4b6dfed778` |
| `sl-civic-archive/src/lib/actions/uploadThemeAsset.ts` | 2132 | `66059bcd62f3580373063d18560609b50ceb66ece21eb69a681c416ba1401130` |
| `sl-civic-archive/src/lib/archive/folderTree.test.ts` | 1846 | `0f5e0c0656d0cfd0562f309ef3c8d5dd3145ae648c128f9d60aed58d1cc38fbd` |
| `sl-civic-archive/src/lib/archive/folderTree.ts` | 1930 | `af072ec4846419ddf6b92d6b76aa838e70f0436a2166ad3f8589535f5f5b89b4` |
| `sl-civic-archive/src/lib/departments.ts` | 1527 | `c104d1d8551618f25761935ed4c830145fa5d32e77e2cec5b1910981b50bb001` |
| `sl-civic-archive/src/lib/forms/generateDocument.test.ts` | 2082 | `14dedc71f2cfdeb551fa5db0b629d0203b93009bc73e9aa964ac94e8dab6ab96` |
| `sl-civic-archive/src/lib/forms/generateDocument.ts` | 2821 | `06a9b8a2007ed1576f971525133a9f22976f70b2341fd2e7e20f725de1847cc3` |
| `sl-civic-archive/src/lib/markdown/canonical.ts` | 493 | `411212f1379ebf82c8531ae03fb5d4da7c3eda2994e242a81c17bba720c892b6` |
| `sl-civic-archive/src/lib/markdown/render.ts` | 412 | `0f7fae9ac485cadd32640ec71fb2d30311a01a864fa078d547546555cbf09a37` |
| `sl-civic-archive/src/lib/origin.ts` | 575 | `3fd5602aef3c0de50bc9945df0cb2e30b9dff39765f188da4d9bb101ec6c4cd1` |
| `sl-civic-archive/src/lib/tenant/activeTenant.ts` | 2061 | `571c981147f19d7db12fd2470c7f4d71fe5f84f8481f8e2803ceedb21ea84892` |
| `sl-civic-archive/src/lib/tenant/queries.ts` | 4546 | `cd69a20246ebe4b49da6d00ac19a0ed9e22a5236aac57d42e2e3a3969c25fb87` |
| `sl-civic-archive/src/lib/tenant/scope.test.ts` | 687 | `eb549251514b9cde66641badf3dc275805c32fc8a4161e29cdd7f31dc8a0f7b5` |
| `sl-civic-archive/src/lib/tenant/scope.ts` | 751 | `bec6c98c3632e8ce13177e6cbb4b1d87b357b9f1c426b69c1ca4bc1a3fbba043` |
| `sl-civic-archive/src/lib/theme/fonts.test.ts` | 1416 | `f4285489e337455590b496d82f38b63d75ed6b2f170dd5a34a64899c4c5ccd80` |
| `sl-civic-archive/src/lib/theme/fonts.ts` | 4157 | `1d960bfb7b52f3c54c4fa8dd570c2d0e87dc85ebf1be5023b9b0fd41135487b4` |
| `sl-civic-archive/src/payload-types.ts` | 20670 | `9f2f4f7d6abb48aa66f3dce9ae2a65b8ebea5f0f5784979d701623fa58aaeb61` |
| `sl-civic-archive/src/payload.config.ts` | 3727 | `99d82fe04d2657f035ddc99c573a0d489eeb9a4b328155a782d3cfbc744fb524` |
| `sl-civic-archive/src/seed/index.ts` | 22743 | `10354604c11a3d8c87abf7e983a9e3421f8b929ff28a0a1edfe737ed17c3c3b0` |
| `sl-civic-archive/tsconfig.json` | 778 | `20bb09e13f1bc94770f516aecdd601afccd422485a7f5ec89ab99acbc02fd85e` |
