import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';
class SDK {
    constructor() {
        this.spec = Oas.init(definition);
        this.core = new APICore(this.spec, 'flutterwavedoc/1.0 (api/6.1.3)');
    }
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config) {
        this.core.setConfig(config);
    }
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    auth(...values) {
        this.core.setAuth(...values);
        return this;
    }
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    server(url, variables = {}) {
        this.core.setServer(url, variables);
    }
    /**
     * List customers
     *
     * @throws FetchError<400, types.CustomersListResponse400> Bad request
     * @throws FetchError<401, types.CustomersListResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersListResponse403> Forbidden
     */
    customers_list(metadata) {
        return this.core.fetch('/customers', 'get', metadata);
    }
    /**
     * Create a customer
     *
     * @summary Create a customer
     * @throws FetchError<400, types.CustomersCreateResponse400> Bad request
     * @throws FetchError<401, types.CustomersCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersCreateResponse403> Forbidden
     * @throws FetchError<409, types.CustomersCreateResponse409> Conflict
     */
    customers_create(body, metadata) {
        return this.core.fetch('/customers', 'post', body, metadata);
    }
    /**
     * Retrieve a customer.
     *
     * @summary Retrieve a customer
     * @throws FetchError<400, types.CustomersGetResponse400> Bad request
     * @throws FetchError<401, types.CustomersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersGetResponse403> Forbidden
     */
    customers_get(metadata) {
        return this.core.fetch('/customers/{id}', 'get', metadata);
    }
    /**
     * Update a customer.
     *
     * @summary Update a customer
     * @throws FetchError<400, types.CustomersPutResponse400> Bad request
     * @throws FetchError<401, types.CustomersPutResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersPutResponse403> Forbidden
     */
    customers_put(body, metadata) {
        return this.core.fetch('/customers/{id}', 'put', body, metadata);
    }
    /**
     * Search customers
     *
     * @summary Search customers
     * @throws FetchError<400, types.CustomersSearchResponse400> Bad request
     * @throws FetchError<401, types.CustomersSearchResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersSearchResponse403> Forbidden
     * @throws FetchError<409, types.CustomersSearchResponse409> Conflict
     */
    customers_search(body, metadata) {
        return this.core.fetch('/customers/search', 'post', body, metadata);
    }
    /**
     * List charges
     *
     * @throws FetchError<400, types.ChargesListResponse400> Bad request
     * @throws FetchError<401, types.ChargesListResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesListResponse403> Forbidden
     */
    charges_list(metadata) {
        return this.core.fetch('/charges', 'get', metadata);
    }
    /**
     * Create a charge
     *
     * @summary Create a charge
     * @throws FetchError<400, types.ChargesPostResponse400> Bad request
     * @throws FetchError<401, types.ChargesPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesPostResponse403> Forbidden
     * @throws FetchError<409, types.ChargesPostResponse409> Conflict
     */
    charges_post(body, metadata) {
        return this.core.fetch('/charges', 'post', body, metadata);
    }
    /**
     * Create a charge with Orchestator helper.
     *
     * @summary Initiate an Orchestrator charge.
     * @throws FetchError<400, types.OrchestrationDirectChargePostResponse400> Bad request
     * @throws FetchError<401, types.OrchestrationDirectChargePostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrchestrationDirectChargePostResponse403> Forbidden
     * @throws FetchError<409, types.OrchestrationDirectChargePostResponse409> Conflict
     */
    orchestration_direct_charge_post(body, metadata) {
        return this.core.fetch('/orchestration/direct-charges', 'post', body, metadata);
    }
    /**
     * Retrieve a charge
     *
     * @summary Retrieve a charge
     * @throws FetchError<400, types.ChargesGetResponse400> Bad request
     * @throws FetchError<401, types.ChargesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesGetResponse403> Forbidden
     */
    charges_get(metadata) {
        return this.core.fetch('/charges/{id}', 'get', metadata);
    }
    /**
     * Update a charge
     *
     * @summary Update a charge
     * @throws FetchError<400, types.ChargesPutResponse400> Bad request
     * @throws FetchError<401, types.ChargesPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesPutResponse403> Forbidden
     */
    charges_put(body, metadata) {
        return this.core.fetch('/charges/{id}', 'put', body, metadata);
    }
    /**
     * List checkout sessions
     *
     * @throws FetchError<400, types.CheckoutSessionsListResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsListResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsListResponse403> Forbidden
     */
    checkout_sessions_list(metadata) {
        return this.core.fetch('/checkout/sessions', 'get', metadata);
    }
    /**
     * Create a checkout session.
     *
     * @summary Create a checkout session
     * @throws FetchError<400, types.CheckoutSessionsPostResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsPostResponse403> Forbidden
     * @throws FetchError<409, types.CheckoutSessionsPostResponse409> Conflict
     */
    checkout_sessions_post(body, metadata) {
        return this.core.fetch('/checkout/sessions', 'post', body, metadata);
    }
    /**
     * Retrieve a checkout session.
     *
     * @summary Retrieve a checkout session
     * @throws FetchError<400, types.CheckoutSessionsGetResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsGetResponse403> Forbidden
     */
    checkout_sessions_get(metadata) {
        return this.core.fetch('/checkout/sessions/{id}', 'get', metadata);
    }
    /**
     * List payment methods
     *
     * @throws FetchError<400, types.PaymentMethodsListResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsListResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsListResponse403> Forbidden
     */
    payment_methods_list(metadata) {
        return this.core.fetch('/payment-methods', 'get', metadata);
    }
    /**
     * Create a payment method
     *
     * @summary Create a payment method
     * @throws FetchError<400, types.PaymentMethodsPostResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsPostResponse403> Forbidden
     * @throws FetchError<409, types.PaymentMethodsPostResponse409> Conflict
     */
    payment_methods_post(body, metadata) {
        return this.core.fetch('/payment-methods', 'post', body, metadata);
    }
    /**
     * Retrieve a payment method.
     *
     * @summary Retrieve a payment method
     * @throws FetchError<400, types.PaymentMethodsGetResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsGetResponse403> Forbidden
     */
    payment_methods_get(metadata) {
        return this.core.fetch('/payment-methods/{id}', 'get', metadata);
    }
    /**
     * Retrieve supported mobile networks by country.
     *
     * @summary Retrieve mobile networks
     * @throws FetchError<400, types.MobileNetworksGetResponse400> Bad request
     * @throws FetchError<401, types.MobileNetworksGetResponse401> Unauthorised request
     * @throws FetchError<403, types.MobileNetworksGetResponse403> Forbidden
     */
    mobile_networks_get(metadata) {
        return this.core.fetch('/mobile-networks', 'get', metadata);
    }
    /**
     * Retrieve supported banks by country.
     *
     * @summary Retrieve banks
     * @throws FetchError<400, types.BanksGetResponse400> Bad request
     * @throws FetchError<401, types.BanksGetResponse401> Unauthorised request
     * @throws FetchError<403, types.BanksGetResponse403> Forbidden
     */
    banks_get(metadata) {
        return this.core.fetch('/banks', 'get', metadata);
    }
    /**
     * Retrieve branches by bank id
     *
     * @summary Retrieve bank branches
     * @throws FetchError<400, types.BankBranchesGetResponse400> Bad request
     * @throws FetchError<401, types.BankBranchesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.BankBranchesGetResponse403> Forbidden
     */
    bank_branches_get(metadata) {
        return this.core.fetch('/banks/{id}/branches', 'get', metadata);
    }
    /**
     * Resolve your customer's bank account information
     *
     * @summary Bank Account Look Up
     * @throws FetchError<400, types.BankAccountResolvePostResponse400> Bad request
     * @throws FetchError<401, types.BankAccountResolvePostResponse401> Unauthorised request
     * @throws FetchError<403, types.BankAccountResolvePostResponse403> Forbidden
     */
    bank_account_resolve_post(body, metadata) {
        return this.core.fetch('/banks/account-resolve', 'post', body, metadata);
    }
    /**
     * Verify wallet account information for a customer.
     *
     * @summary Wallet Account Look Up
     * @throws FetchError<400, types.WalletAccountResolvePostResponse400> Bad request
     * @throws FetchError<401, types.WalletAccountResolvePostResponse401> Unauthorised request
     * @throws FetchError<403, types.WalletAccountResolvePostResponse403> Forbidden
     */
    wallet_account_resolve_post(body, metadata) {
        return this.core.fetch('/wallets/account-resolve', 'post', body, metadata);
    }
    /**
     * Retrieve wallet statement
     *
     * @summary Retrieve wallet statement
     * @throws FetchError<400, types.GetWalletStatementResponse400> Bad request
     * @throws FetchError<401, types.GetWalletStatementResponse401> Unauthorised request
     * @throws FetchError<403, types.GetWalletStatementResponse403> Forbidden
     */
    get_wallet_statement(metadata) {
        return this.core.fetch('/wallets/statement', 'get', metadata);
    }
    /**
     * Create a transfer with Orchestrator helper.
     *
     * @summary Initiate an Orchestrator transfer.
     * @throws FetchError<400, types.DirectTransfersPostResponse400> Bad request
     * @throws FetchError<401, types.DirectTransfersPostResponse401> Unauthorised request
     * @throws FetchError<403, types.DirectTransfersPostResponse403> Forbidden
     * @throws FetchError<409, types.DirectTransfersPostResponse409> Conflict
     */
    direct_transfers_post(body, metadata) {
        return this.core.fetch('/direct-transfers', 'post', body, metadata);
    }
    /**
     * Fetch a currency's balance
     *
     * @summary Fetch a currency's wallet balance
     * @throws FetchError<400, types.FetchCurrencyWalletBalanceResponse400> Bad request
     * @throws FetchError<401, types.FetchCurrencyWalletBalanceResponse401> Unauthorised request
     * @throws FetchError<403, types.FetchCurrencyWalletBalanceResponse403> Forbidden
     */
    fetch_currency_wallet_balance(metadata) {
        return this.core.fetch('/wallets/balances/{currency}', 'get', metadata);
    }
    /**
     * Fetch wallet balance for multiple currencies
     *
     * @summary Fetch wallet balance for multiple currencies
     * @throws FetchError<400, types.FetchWalletBalancesResponse400> Bad request
     * @throws FetchError<401, types.FetchWalletBalancesResponse401> Unauthorised request
     * @throws FetchError<403, types.FetchWalletBalancesResponse403> Forbidden
     */
    fetch_wallet_balances(metadata) {
        return this.core.fetch('/wallets/balances', 'get', metadata);
    }
    /**
     * Creates a direct transfer using only the recipient and sender IDs. Before calling this
     * endpoint, make sure you have already created both the recipient and the sender via their
     * respective endpoints and obtained their IDs.
     *
     * @summary Create a transfer
     * @throws FetchError<400, types.TransfersPostResponse400> Bad request
     * @throws FetchError<401, types.TransfersPostResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersPostResponse403> Forbidden
     * @throws FetchError<409, types.TransfersPostResponse409> Conflict
     */
    transfers_post(body, metadata) {
        return this.core.fetch('/transfers', 'post', body, metadata);
    }
    /**
     * List transfers
     *
     * @throws FetchError<400, types.TransfersListResponse400> Bad request
     * @throws FetchError<401, types.TransfersListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersListResponse403> Forbidden
     */
    transfers_list(metadata) {
        return this.core.fetch('/transfers', 'get', metadata);
    }
    /**
     * Retrieve a transfer
     *
     * @summary Retrieve a transfer
     * @throws FetchError<400, types.TransferGetResponse400> Bad request
     * @throws FetchError<401, types.TransferGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferGetResponse403> Forbidden
     */
    transfer_get(metadata) {
        return this.core.fetch('/transfers/{id}', 'get', metadata);
    }
    /**
     * This can only be used to update instructions about a deferred payout.
     *
     * @summary Update a transfer
     * @throws FetchError<400, types.TransferPutResponse400> Bad request
     * @throws FetchError<401, types.TransferPutResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferPutResponse403> Forbidden
     */
    transfer_put(body, metadata) {
        return this.core.fetch('/transfers/{id}', 'put', body, metadata);
    }
    /**
     * Retry a failed transfer or duplicate a successful transfer
     *
     * @summary Retry or Duplicate a transfer
     * @throws FetchError<400, types.TransferPostRetryResponse400> Bad request
     * @throws FetchError<401, types.TransferPostRetryResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferPostRetryResponse403> Forbidden
     * @throws FetchError<409, types.TransferPostRetryResponse409> Conflict
     */
    transfer_post_retry(body, metadata) {
        return this.core.fetch('/transfers/{id}/retries', 'post', body, metadata);
    }
    /**
     * List transfer recipients
     *
     * @throws FetchError<400, types.TransfersRecipientsListResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsListResponse403> Forbidden
     */
    transfers_recipients_list(metadata) {
        return this.core.fetch('/transfers/recipients', 'get', metadata);
    }
    /**
     * Create a transfer recipient
     *
     * @summary Create a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsCreateResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsCreateResponse403> Forbidden
     * @throws FetchError<409, types.TransfersRecipientsCreateResponse409> Conflict
     */
    transfers_recipients_create(body, metadata) {
        return this.core.fetch('/transfers/recipients', 'post', body, metadata);
    }
    /**
     * Retrieve a transfer recipient
     *
     * @summary Retrieve a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsGetResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsGetResponse403> Forbidden
     */
    transfers_recipients_get(metadata) {
        return this.core.fetch('/transfers/recipients/{id}', 'get', metadata);
    }
    /**
     * Delete a transfer recipient
     *
     * @summary Delete a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsDeleteResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsDeleteResponse403> Forbidden
     */
    transfers_recipients_delete(metadata) {
        return this.core.fetch('/transfers/recipients/{id}', 'delete', metadata);
    }
    /**
     * List transfer senders
     *
     * @throws FetchError<400, types.TransfersSendersListResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersListResponse403> Forbidden
     */
    transfers_senders_list(metadata) {
        return this.core.fetch('/transfers/senders', 'get', metadata);
    }
    /**
     * Create a transfer sender
     *
     * @summary Create a transfer sender
     * @throws FetchError<400, types.TransfersSendersCreateResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersCreateResponse403> Forbidden
     * @throws FetchError<409, types.TransfersSendersCreateResponse409> Conflict
     */
    transfers_senders_create(body, metadata) {
        return this.core.fetch('/transfers/senders', 'post', body, metadata);
    }
    /**
     * Retrieve a transfer sender
     *
     * @summary Retrieve a transfer sender
     * @throws FetchError<400, types.TransfersSendersGetResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersGetResponse403> Forbidden
     */
    transfers_senders_get(metadata) {
        return this.core.fetch('/transfers/senders/{id}', 'get', metadata);
    }
    /**
     * Delete a transfer sender
     *
     * @summary Delete a transfer sender
     * @throws FetchError<400, types.TransfersSendersDeleteResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersDeleteResponse403> Forbidden
     */
    transfers_senders_delete(metadata) {
        return this.core.fetch('/transfers/senders/{id}', 'delete', metadata);
    }
    /**
     * Retrieve transfer rate for international transfers
     *
     * @summary Rate conversion
     * @throws FetchError<400, types.TransferRatesPostResponse400> Bad request
     * @throws FetchError<401, types.TransferRatesPostResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferRatesPostResponse403> Forbidden
     */
    transfer_rates_post(body, metadata) {
        return this.core.fetch('/transfers/rates', 'post', body, metadata);
    }
    /**
     * Retrieve a converted rate item using the returned unique identifier
     *
     * @summary Fetch converted rate
     * @throws FetchError<400, types.TransferRatesGetResponse400> Bad request
     * @throws FetchError<401, types.TransferRatesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferRatesGetResponse403> Forbidden
     */
    transfer_rates_get(metadata) {
        return this.core.fetch('/transfers/rates/{id}', 'get', metadata);
    }
    /**
     * Get profile
     *
     * @summary Get profile
     * @throws FetchError<400, types.ProfileGetResponse400> Bad request
     * @throws FetchError<401, types.ProfileGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileGetResponse403> Forbidden
     * @throws FetchError<409, types.ProfileGetResponse409> Conflict
     */
    profile_get(metadata) {
        return this.core.fetch('/profile', 'get', metadata);
    }
    /**
     * Perform an action on profile
     *
     * @summary Perform an action on profile
     * @throws FetchError<400, types.ProfileActionsPostResponse400> Bad request
     * @throws FetchError<401, types.ProfileActionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileActionsPostResponse403> Forbidden
     * @throws FetchError<409, types.ProfileActionsPostResponse409> Conflict
     */
    profile_actions_post(body, metadata) {
        return this.core.fetch('/profile/actions', 'post', body, metadata);
    }
    /**
     * Perform an update action on credential
     *
     * @summary Perform an update action on credential
     * @throws FetchError<400, types.ProfileCredentialsActionsPutResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsActionsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsActionsPutResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsActionsPutResponse409> Conflict
     */
    profile_credentials_actions_put(body, metadata) {
        return this.core.fetch('/profile/actions', 'put', body, metadata);
    }
    /**
     * Get credential
     *
     * @summary Get credential
     * @throws FetchError<400, types.ProfileCredentialsGetResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsGetResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsGetResponse409> Conflict
     */
    profile_credentials_get(metadata) {
        return this.core.fetch('/profile/credentials', 'get', metadata);
    }
    /**
     * Perform an action on credential
     *
     * @summary Perform an action on credential
     * @throws FetchError<400, types.ProfileCredentialsActionsPostResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsActionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsActionsPostResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsActionsPostResponse409> Conflict
     */
    profile_credentials_actions_post(body, metadata) {
        return this.core.fetch('/profile/credentials/actions', 'post', body, metadata);
    }
    /**
     * List webhook endpoints
     *
     * @throws FetchError<400, types.WebhookEndpointsListResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsListResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsListResponse403> Forbidden
     */
    webhook_endpoints_list(metadata) {
        return this.core.fetch('/profile/webhook-endpoints', 'get', metadata);
    }
    /**
     * Create a webhook endpoint
     *
     * @summary Create a webhook endpoint
     * @throws FetchError<400, types.WebhookEndpointsPostResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsPostResponse403> Forbidden
     * @throws FetchError<409, types.WebhookEndpointsPostResponse409> Conflict
     */
    webhook_endpoints_post(body, metadata) {
        return this.core.fetch('/profile/webhook-endpoints', 'post', body, metadata);
    }
    /**
     * Update a webhook endpoint
     *
     * @summary Update a webhook endpoint
     * @throws FetchError<400, types.WebhookEndpointsPutResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsPutResponse403> Forbidden
     * @throws FetchError<409, types.WebhookEndpointsPutResponse409> Conflict
     */
    webhook_endpoints_put(body, metadata) {
        return this.core.fetch('/profile/webhook-endpoints/{id}', 'put', body, metadata);
    }
    /**
     * Delete a webhook endpoint
     *
     * @throws FetchError<400, types.WebhookEndpointsDeleteResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsDeleteResponse403> Forbidden
     */
    webhook_endpoints_delete(metadata) {
        return this.core.fetch('/profile/webhook-endpoints/{id}', 'delete', metadata);
    }
    /**
     * Exchange token
     *
     * @summary Exchange token
     * @throws FetchError<400, types.IdentityTokenExchangeResponse400> Bad request
     * @throws FetchError<401, types.IdentityTokenExchangeResponse401> Unauthorised request
     * @throws FetchError<403, types.IdentityTokenExchangeResponse403> Forbidden
     * @throws FetchError<409, types.IdentityTokenExchangeResponse409> Conflict
     */
    identity_token_exchange(body, metadata) {
        return this.core.fetch('/profile/authentication/tokens', 'post', body, metadata);
    }
    /**
     * (Sandbox) Update a charge status
     *
     * @summary (Sandbox) Update a charge status
     * @throws FetchError<400, types.RedirectSessionsChargesPutResponse400> Bad request
     * @throws FetchError<401, types.RedirectSessionsChargesPutResponse401> Unauthorised request
     * @throws FetchError<403, types.RedirectSessionsChargesPutResponse403> Forbidden
     * @throws FetchError<409, types.RedirectSessionsChargesPutResponse409> Conflict
     */
    redirect_sessions_charges_put(body, metadata) {
        return this.core.fetch('/redirect-sessions/charges', 'put', body, metadata);
    }
    /**
     * List settlement
     *
     * @throws FetchError<400, types.SettlementListResponse400> Bad request
     * @throws FetchError<401, types.SettlementListResponse401> Unauthorised request
     * @throws FetchError<403, types.SettlementListResponse403> Forbidden
     */
    settlement_list(metadata) {
        return this.core.fetch('/settlements', 'get', metadata);
    }
    /**
     * Retrieve a settlement
     *
     * @summary Retrieve a settlement
     * @throws FetchError<400, types.SettlementGetResponse400> Bad request
     * @throws FetchError<401, types.SettlementGetResponse401> Unauthorised request
     * @throws FetchError<403, types.SettlementGetResponse403> Forbidden
     */
    settlement_get(metadata) {
        return this.core.fetch('/settlements/{id}', 'get', metadata);
    }
    /**
     * List chargebacks
     *
     * @throws FetchError<400, types.ChargebacksListResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksListResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksListResponse403> Forbidden
     */
    chargebacks_list(metadata) {
        return this.core.fetch('/chargebacks', 'get', metadata);
    }
    /**
     * Create a chargeback
     *
     * @throws FetchError<400, types.ChargebacksPostResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksPostResponse403> Forbidden
     */
    chargebacks_post(body, metadata) {
        return this.core.fetch('/chargebacks', 'post', body, metadata);
    }
    /**
     * get chargeback by id
     *
     * @throws FetchError<400, types.ChargebacksGetByIdResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksGetByIdResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksGetByIdResponse403> Forbidden
     */
    chargebacks_get_by_id(metadata) {
        return this.core.fetch('/chargebacks/{id}', 'get', metadata);
    }
    /**
     * Update a chargeback
     *
     * @summary Update a chargeback
     * @throws FetchError<400, types.ChargebackPutResponse400> Bad request
     * @throws FetchError<401, types.ChargebackPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebackPutResponse403> Forbidden
     */
    chargeback_put(body, metadata) {
        return this.core.fetch('/chargebacks/{id}', 'put', body, metadata);
    }
    /**
     * List refunds
     *
     * @throws FetchError<400, types.RefundsListResponse400> Bad request
     * @throws FetchError<401, types.RefundsListResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsListResponse403> Forbidden
     */
    refunds_list(metadata) {
        return this.core.fetch('/refunds', 'get', metadata);
    }
    /**
     * Create a refund
     *
     * @summary Create a refund
     * @throws FetchError<400, types.RefundsPostResponse400> Bad request
     * @throws FetchError<401, types.RefundsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsPostResponse403> Forbidden
     * @throws FetchError<409, types.RefundsPostResponse409> Conflict
     */
    refunds_post(body, metadata) {
        return this.core.fetch('/refunds', 'post', body, metadata);
    }
    /**
     * Retrieve a refund
     *
     * @throws FetchError<400, types.RefundsGetResponse400> Bad request
     * @throws FetchError<401, types.RefundsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsGetResponse403> Forbidden
     */
    refunds_get(metadata) {
        return this.core.fetch('/refunds/{id}', 'get', metadata);
    }
    /**
     * (Experience) Update a charge status with V2 webhook
     *
     * @summary (Experience) Update a charge status with V2 webhook
     */
    charges_v2_webhook_update_post(body) {
        return this.core.fetch('/internal/charges/v2-webhook-update', 'post', body);
    }
    /**
     * Retrieve transaction fees.
     *
     * @summary Retrieve fees
     * @throws FetchError<400, types.FeesGetResponse400> Bad request
     * @throws FetchError<401, types.FeesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.FeesGetResponse403> Forbidden
     */
    fees_get(metadata) {
        return this.core.fetch('/fees', 'get', metadata);
    }
    /**
     * List orders
     *
     * @throws FetchError<400, types.OrdersListResponse400> Bad request
     * @throws FetchError<401, types.OrdersListResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersListResponse403> Forbidden
     */
    orders_list(metadata) {
        return this.core.fetch('/orders', 'get', metadata);
    }
    /**
     * Create an order
     *
     * @summary Create an order
     * @throws FetchError<400, types.OrdersPostResponse400> Bad request
     * @throws FetchError<401, types.OrdersPostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersPostResponse403> Forbidden
     * @throws FetchError<409, types.OrdersPostResponse409> Conflict
     */
    orders_post(body, metadata) {
        return this.core.fetch('/orders', 'post', body, metadata);
    }
    /**
     * Retrieve an order
     *
     * @summary Retrieve an order
     * @throws FetchError<400, types.OrdersGetResponse400> Bad request
     * @throws FetchError<401, types.OrdersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersGetResponse403> Forbidden
     */
    orders_get(metadata) {
        return this.core.fetch('/orders/{id}', 'get', metadata);
    }
    /**
     * Update an order
     *
     * @summary Update an order
     * @throws FetchError<400, types.OrdersPutResponse400> Bad request
     * @throws FetchError<401, types.OrdersPutResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersPutResponse403> Forbidden
     */
    orders_put(body, metadata) {
        return this.core.fetch('/orders/{id}', 'put', body, metadata);
    }
    /**
     * Create an order with orchestator helper.
     *
     * @summary Initiate Order with Orchestrator.
     * @throws FetchError<400, types.OrchestrationDirectOrderPostResponse400> Bad request
     * @throws FetchError<401, types.OrchestrationDirectOrderPostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrchestrationDirectOrderPostResponse403> Forbidden
     * @throws FetchError<409, types.OrchestrationDirectOrderPostResponse409> Conflict
     */
    orchestration_direct_order_post(body, metadata) {
        return this.core.fetch('/orchestration/direct-orders', 'post', body, metadata);
    }
    /**
     * List all virtual accounts
     *
     * @throws FetchError<400, types.VirtualAccountsListResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsListResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsListResponse403> Forbidden
     */
    virtual_accounts_list(metadata) {
        return this.core.fetch('/virtual-accounts', 'get', metadata);
    }
    /**
     * Create a virtual account
     *
     * @summary Create a virtual account
     * @throws FetchError<400, types.VirtualAccountsPostResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsPostResponse403> Forbidden
     * @throws FetchError<409, types.VirtualAccountsPostResponse409> Conflict
     */
    virtual_accounts_post(body, metadata) {
        return this.core.fetch('/virtual-accounts', 'post', body, metadata);
    }
    /**
     * Retrieve a virtual account
     *
     * @summary Retrieve a virtual account
     * @throws FetchError<400, types.VirtualAccountGetResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountGetResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountGetResponse403> Forbidden
     */
    virtual_account_get(metadata) {
        return this.core.fetch('/virtual-accounts/{id}', 'get', metadata);
    }
    /**
     * Update a virtual account
     *
     * @summary Update a virtual account
     * @throws FetchError<400, types.VirtualAccountsPutResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsPutResponse403> Forbidden
     */
    virtual_accounts_put(body, metadata) {
        return this.core.fetch('/virtual-accounts/{id}', 'put', body, metadata);
    }
    /**
     * (Experience) Update a refund status with V2 webhook
     *
     * @summary (Experience) Update a refund status with V2 webhook
     */
    refunds_v2_webhook_update_post(body) {
        return this.core.fetch('/internal/refunds/v2-webhook-update', 'post', body);
    }
}
const createSDK = (() => { return new SDK(); })();
export default createSDK;
