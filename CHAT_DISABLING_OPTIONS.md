# Chat-disabled behavior

Chat is disabled in source, not merely by omitting credentials.

- The root layout does not import or render a chat component.
- The upstream chat components, remote API implementations and chat-only
  dependencies are not included.
- Chat-mode query parameters are not propagated through catalog navigation.
- The catch-all route in
  [src/app/api/chat/[[...path]]/route.ts](app/contoso-web/src/app/api/chat/[[...path]]/route.ts)
  handles `/api/chat` and all subpaths. It returns HTTP 404 with:

```json
{"error":"Chat is disabled in this deployment."}
```

The route explicitly handles GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS
without making any outbound request. As usual, HEAD has no response body.
No Azure AI Search, AI Services, Prompt Flow or vision credentials are required.

## Verification

Build and run the production smoke tests:

```text
npm --prefix app/contoso-web run build
npm --prefix app/contoso-web run test:smoke
```

These check disabled responses for the original grounded, promptflow and visual
paths as well as the base chat path. Opening `/?type=visual` does not restore
chat. The catalog and product pages remain usable.

## Previous removal helper

The old `disable-chat.sh` helper was removed. It targeted Pages Router paths
that do not exist in this App Router application and produced invalid source
replacements. Do not use copies of that helper on this app.

## Enabling chat later

Setting environment variables alone will not enable chat. It is a separate
feature change requiring restoration/adaptation of the upstream UI, dependencies,
and backend integrations, replacement of the disabled route, secure credential
handling, testing, repackaging, and redeployment. The pinned upstream sample is
archived and its original Azure APIs may need modernization.
