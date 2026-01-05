import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core';
import Oas from 'oas';
import APICore from 'api/dist/core';
declare class SDK {
    spec: Oas;
    core: APICore;
    constructor();
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config: ConfigOptions): void;
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
    auth(...values: string[] | number[]): this;
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
    server(url: string, variables?: {}): void;
    /**
     * List customers
     *
     * @throws FetchError<400, types.CustomersListResponse400> Bad request
     * @throws FetchError<401, types.CustomersListResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersListResponse403> Forbidden
     */
    customers_list(metadata?: types.CustomersListMetadataParam): Promise<FetchResponse<200, types.CustomersListResponse200>>;
    /**
     * Create a customer
     *
     * @summary Create a customer
     * @throws FetchError<400, types.CustomersCreateResponse400> Bad request
     * @throws FetchError<401, types.CustomersCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersCreateResponse403> Forbidden
     * @throws FetchError<409, types.CustomersCreateResponse409> Conflict
     */
    customers_create(body: types.CustomersCreateBodyParam, metadata?: types.CustomersCreateMetadataParam): Promise<FetchResponse<201, types.CustomersCreateResponse201>>;
    /**
     * Retrieve a customer.
     *
     * @summary Retrieve a customer
     * @throws FetchError<400, types.CustomersGetResponse400> Bad request
     * @throws FetchError<401, types.CustomersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersGetResponse403> Forbidden
     */
    customers_get(metadata: types.CustomersGetMetadataParam): Promise<FetchResponse<200, types.CustomersGetResponse200>>;
    /**
     * Update a customer.
     *
     * @summary Update a customer
     * @throws FetchError<400, types.CustomersPutResponse400> Bad request
     * @throws FetchError<401, types.CustomersPutResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersPutResponse403> Forbidden
     */
    customers_put(body: types.CustomersPutBodyParam, metadata: types.CustomersPutMetadataParam): Promise<FetchResponse<200, types.CustomersPutResponse200>>;
    /**
     * Search customers
     *
     * @summary Search customers
     * @throws FetchError<400, types.CustomersSearchResponse400> Bad request
     * @throws FetchError<401, types.CustomersSearchResponse401> Unauthorised request
     * @throws FetchError<403, types.CustomersSearchResponse403> Forbidden
     * @throws FetchError<409, types.CustomersSearchResponse409> Conflict
     */
    customers_search(body: types.CustomersSearchBodyParam, metadata?: types.CustomersSearchMetadataParam): Promise<FetchResponse<200, types.CustomersSearchResponse200>>;
    /**
     * List charges
     *
     * @throws FetchError<400, types.ChargesListResponse400> Bad request
     * @throws FetchError<401, types.ChargesListResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesListResponse403> Forbidden
     */
    charges_list(metadata?: types.ChargesListMetadataParam): Promise<FetchResponse<200, types.ChargesListResponse200>>;
    /**
     * Create a charge
     *
     * @summary Create a charge
     * @throws FetchError<400, types.ChargesPostResponse400> Bad request
     * @throws FetchError<401, types.ChargesPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesPostResponse403> Forbidden
     * @throws FetchError<409, types.ChargesPostResponse409> Conflict
     */
    charges_post(body: types.ChargesPostBodyParam, metadata?: types.ChargesPostMetadataParam): Promise<FetchResponse<201, types.ChargesPostResponse201>>;
    /**
     * Create a charge with Orchestator helper.
     *
     * @summary Initiate an Orchestrator charge.
     * @throws FetchError<400, types.OrchestrationDirectChargePostResponse400> Bad request
     * @throws FetchError<401, types.OrchestrationDirectChargePostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrchestrationDirectChargePostResponse403> Forbidden
     * @throws FetchError<409, types.OrchestrationDirectChargePostResponse409> Conflict
     */
    orchestration_direct_charge_post(body: types.OrchestrationDirectChargePostBodyParam, metadata?: types.OrchestrationDirectChargePostMetadataParam): Promise<FetchResponse<201, types.OrchestrationDirectChargePostResponse201>>;
    /**
     * Retrieve a charge
     *
     * @summary Retrieve a charge
     * @throws FetchError<400, types.ChargesGetResponse400> Bad request
     * @throws FetchError<401, types.ChargesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesGetResponse403> Forbidden
     */
    charges_get(metadata: types.ChargesGetMetadataParam): Promise<FetchResponse<200, types.ChargesGetResponse200>>;
    /**
     * Update a charge
     *
     * @summary Update a charge
     * @throws FetchError<400, types.ChargesPutResponse400> Bad request
     * @throws FetchError<401, types.ChargesPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargesPutResponse403> Forbidden
     */
    charges_put(body: types.ChargesPutBodyParam, metadata: types.ChargesPutMetadataParam): Promise<FetchResponse<200, types.ChargesPutResponse200>>;
    /**
     * List checkout sessions
     *
     * @throws FetchError<400, types.CheckoutSessionsListResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsListResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsListResponse403> Forbidden
     */
    checkout_sessions_list(metadata?: types.CheckoutSessionsListMetadataParam): Promise<FetchResponse<200, types.CheckoutSessionsListResponse200>>;
    /**
     * Create a checkout session.
     *
     * @summary Create a checkout session
     * @throws FetchError<400, types.CheckoutSessionsPostResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsPostResponse403> Forbidden
     * @throws FetchError<409, types.CheckoutSessionsPostResponse409> Conflict
     */
    checkout_sessions_post(body: types.CheckoutSessionsPostBodyParam, metadata?: types.CheckoutSessionsPostMetadataParam): Promise<FetchResponse<200, types.CheckoutSessionsPostResponse200>>;
    /**
     * Retrieve a checkout session.
     *
     * @summary Retrieve a checkout session
     * @throws FetchError<400, types.CheckoutSessionsGetResponse400> Bad request
     * @throws FetchError<401, types.CheckoutSessionsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.CheckoutSessionsGetResponse403> Forbidden
     */
    checkout_sessions_get(metadata: types.CheckoutSessionsGetMetadataParam): Promise<FetchResponse<200, types.CheckoutSessionsGetResponse200>>;
    /**
     * List payment methods
     *
     * @throws FetchError<400, types.PaymentMethodsListResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsListResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsListResponse403> Forbidden
     */
    payment_methods_list(metadata?: types.PaymentMethodsListMetadataParam): Promise<FetchResponse<200, types.PaymentMethodsListResponse200>>;
    /**
     * Create a payment method
     *
     * @summary Create a payment method
     * @throws FetchError<400, types.PaymentMethodsPostResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsPostResponse403> Forbidden
     * @throws FetchError<409, types.PaymentMethodsPostResponse409> Conflict
     */
    payment_methods_post(body: types.PaymentMethodsPostBodyParam, metadata?: types.PaymentMethodsPostMetadataParam): Promise<FetchResponse<201, types.PaymentMethodsPostResponse201>>;
    /**
     * Retrieve a payment method.
     *
     * @summary Retrieve a payment method
     * @throws FetchError<400, types.PaymentMethodsGetResponse400> Bad request
     * @throws FetchError<401, types.PaymentMethodsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.PaymentMethodsGetResponse403> Forbidden
     */
    payment_methods_get(metadata: types.PaymentMethodsGetMetadataParam): Promise<FetchResponse<200, types.PaymentMethodsGetResponse200>>;
    /**
     * Retrieve supported mobile networks by country.
     *
     * @summary Retrieve mobile networks
     * @throws FetchError<400, types.MobileNetworksGetResponse400> Bad request
     * @throws FetchError<401, types.MobileNetworksGetResponse401> Unauthorised request
     * @throws FetchError<403, types.MobileNetworksGetResponse403> Forbidden
     */
    mobile_networks_get(metadata: types.MobileNetworksGetMetadataParam): Promise<FetchResponse<200, types.MobileNetworksGetResponse200>>;
    /**
     * Retrieve supported banks by country.
     *
     * @summary Retrieve banks
     * @throws FetchError<400, types.BanksGetResponse400> Bad request
     * @throws FetchError<401, types.BanksGetResponse401> Unauthorised request
     * @throws FetchError<403, types.BanksGetResponse403> Forbidden
     */
    banks_get(metadata: types.BanksGetMetadataParam): Promise<FetchResponse<200, types.BanksGetResponse200>>;
    /**
     * Retrieve branches by bank id
     *
     * @summary Retrieve bank branches
     * @throws FetchError<400, types.BankBranchesGetResponse400> Bad request
     * @throws FetchError<401, types.BankBranchesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.BankBranchesGetResponse403> Forbidden
     */
    bank_branches_get(metadata: types.BankBranchesGetMetadataParam): Promise<FetchResponse<200, types.BankBranchesGetResponse200>>;
    /**
     * Resolve your customer's bank account information
     *
     * @summary Bank Account Look Up
     * @throws FetchError<400, types.BankAccountResolvePostResponse400> Bad request
     * @throws FetchError<401, types.BankAccountResolvePostResponse401> Unauthorised request
     * @throws FetchError<403, types.BankAccountResolvePostResponse403> Forbidden
     */
    bank_account_resolve_post(body: types.BankAccountResolvePostBodyParam, metadata?: types.BankAccountResolvePostMetadataParam): Promise<FetchResponse<200, types.BankAccountResolvePostResponse200>>;
    /**
     * Verify wallet account information for a customer.
     *
     * @summary Wallet Account Look Up
     * @throws FetchError<400, types.WalletAccountResolvePostResponse400> Bad request
     * @throws FetchError<401, types.WalletAccountResolvePostResponse401> Unauthorised request
     * @throws FetchError<403, types.WalletAccountResolvePostResponse403> Forbidden
     */
    wallet_account_resolve_post(body: types.WalletAccountResolvePostBodyParam, metadata?: types.WalletAccountResolvePostMetadataParam): Promise<FetchResponse<200, types.WalletAccountResolvePostResponse200>>;
    /**
     * Retrieve wallet statement
     *
     * @summary Retrieve wallet statement
     * @throws FetchError<400, types.GetWalletStatementResponse400> Bad request
     * @throws FetchError<401, types.GetWalletStatementResponse401> Unauthorised request
     * @throws FetchError<403, types.GetWalletStatementResponse403> Forbidden
     */
    get_wallet_statement(metadata: types.GetWalletStatementMetadataParam): Promise<FetchResponse<200, types.GetWalletStatementResponse200>>;
    /**
     * Create a transfer with Orchestrator helper.
     *
     * @summary Initiate an Orchestrator transfer.
     * @throws FetchError<400, types.DirectTransfersPostResponse400> Bad request
     * @throws FetchError<401, types.DirectTransfersPostResponse401> Unauthorised request
     * @throws FetchError<403, types.DirectTransfersPostResponse403> Forbidden
     * @throws FetchError<409, types.DirectTransfersPostResponse409> Conflict
     */
    direct_transfers_post(body: types.DirectTransfersPostBodyParam, metadata?: types.DirectTransfersPostMetadataParam): Promise<FetchResponse<201, types.DirectTransfersPostResponse201>>;
    /**
     * Fetch a currency's balance
     *
     * @summary Fetch a currency's wallet balance
     * @throws FetchError<400, types.FetchCurrencyWalletBalanceResponse400> Bad request
     * @throws FetchError<401, types.FetchCurrencyWalletBalanceResponse401> Unauthorised request
     * @throws FetchError<403, types.FetchCurrencyWalletBalanceResponse403> Forbidden
     */
    fetch_currency_wallet_balance(metadata: types.FetchCurrencyWalletBalanceMetadataParam): Promise<FetchResponse<200, types.FetchCurrencyWalletBalanceResponse200>>;
    /**
     * Fetch wallet balance for multiple currencies
     *
     * @summary Fetch wallet balance for multiple currencies
     * @throws FetchError<400, types.FetchWalletBalancesResponse400> Bad request
     * @throws FetchError<401, types.FetchWalletBalancesResponse401> Unauthorised request
     * @throws FetchError<403, types.FetchWalletBalancesResponse403> Forbidden
     */
    fetch_wallet_balances(metadata?: types.FetchWalletBalancesMetadataParam): Promise<FetchResponse<200, types.FetchWalletBalancesResponse200>>;
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
    transfers_post(body: types.TransfersPostBodyParam, metadata?: types.TransfersPostMetadataParam): Promise<FetchResponse<201, types.TransfersPostResponse201>>;
    /**
     * List transfers
     *
     * @throws FetchError<400, types.TransfersListResponse400> Bad request
     * @throws FetchError<401, types.TransfersListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersListResponse403> Forbidden
     */
    transfers_list(metadata?: types.TransfersListMetadataParam): Promise<FetchResponse<200, types.TransfersListResponse200>>;
    /**
     * Retrieve a transfer
     *
     * @summary Retrieve a transfer
     * @throws FetchError<400, types.TransferGetResponse400> Bad request
     * @throws FetchError<401, types.TransferGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferGetResponse403> Forbidden
     */
    transfer_get(metadata: types.TransferGetMetadataParam): Promise<FetchResponse<200, types.TransferGetResponse200>>;
    /**
     * This can only be used to update instructions about a deferred payout.
     *
     * @summary Update a transfer
     * @throws FetchError<400, types.TransferPutResponse400> Bad request
     * @throws FetchError<401, types.TransferPutResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferPutResponse403> Forbidden
     */
    transfer_put(body: types.TransferPutBodyParam, metadata: types.TransferPutMetadataParam): Promise<FetchResponse<200, types.TransferPutResponse200>>;
    /**
     * Retry a failed transfer or duplicate a successful transfer
     *
     * @summary Retry or Duplicate a transfer
     * @throws FetchError<400, types.TransferPostRetryResponse400> Bad request
     * @throws FetchError<401, types.TransferPostRetryResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferPostRetryResponse403> Forbidden
     * @throws FetchError<409, types.TransferPostRetryResponse409> Conflict
     */
    transfer_post_retry(body: types.TransferPostRetryBodyParam, metadata: types.TransferPostRetryMetadataParam): Promise<FetchResponse<201, types.TransferPostRetryResponse201>>;
    /**
     * List transfer recipients
     *
     * @throws FetchError<400, types.TransfersRecipientsListResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsListResponse403> Forbidden
     */
    transfers_recipients_list(metadata?: types.TransfersRecipientsListMetadataParam): Promise<FetchResponse<200, types.TransfersRecipientsListResponse200>>;
    /**
     * Create a transfer recipient
     *
     * @summary Create a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsCreateResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsCreateResponse403> Forbidden
     * @throws FetchError<409, types.TransfersRecipientsCreateResponse409> Conflict
     */
    transfers_recipients_create(body: types.TransfersRecipientsCreateBodyParam, metadata?: types.TransfersRecipientsCreateMetadataParam): Promise<FetchResponse<201, types.TransfersRecipientsCreateResponse201>>;
    /**
     * Retrieve a transfer recipient
     *
     * @summary Retrieve a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsGetResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsGetResponse403> Forbidden
     */
    transfers_recipients_get(metadata: types.TransfersRecipientsGetMetadataParam): Promise<FetchResponse<200, types.TransfersRecipientsGetResponse200>>;
    /**
     * Delete a transfer recipient
     *
     * @summary Delete a transfer recipient
     * @throws FetchError<400, types.TransfersRecipientsDeleteResponse400> Bad request
     * @throws FetchError<401, types.TransfersRecipientsDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersRecipientsDeleteResponse403> Forbidden
     */
    transfers_recipients_delete(metadata: types.TransfersRecipientsDeleteMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List transfer senders
     *
     * @throws FetchError<400, types.TransfersSendersListResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersListResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersListResponse403> Forbidden
     */
    transfers_senders_list(metadata?: types.TransfersSendersListMetadataParam): Promise<FetchResponse<200, types.TransfersSendersListResponse200>>;
    /**
     * Create a transfer sender
     *
     * @summary Create a transfer sender
     * @throws FetchError<400, types.TransfersSendersCreateResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersCreateResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersCreateResponse403> Forbidden
     * @throws FetchError<409, types.TransfersSendersCreateResponse409> Conflict
     */
    transfers_senders_create(body: types.TransfersSendersCreateBodyParam, metadata?: types.TransfersSendersCreateMetadataParam): Promise<FetchResponse<201, types.TransfersSendersCreateResponse201>>;
    /**
     * Retrieve a transfer sender
     *
     * @summary Retrieve a transfer sender
     * @throws FetchError<400, types.TransfersSendersGetResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersGetResponse403> Forbidden
     */
    transfers_senders_get(metadata: types.TransfersSendersGetMetadataParam): Promise<FetchResponse<200, types.TransfersSendersGetResponse200>>;
    /**
     * Delete a transfer sender
     *
     * @summary Delete a transfer sender
     * @throws FetchError<400, types.TransfersSendersDeleteResponse400> Bad request
     * @throws FetchError<401, types.TransfersSendersDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.TransfersSendersDeleteResponse403> Forbidden
     */
    transfers_senders_delete(metadata: types.TransfersSendersDeleteMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieve transfer rate for international transfers
     *
     * @summary Rate conversion
     * @throws FetchError<400, types.TransferRatesPostResponse400> Bad request
     * @throws FetchError<401, types.TransferRatesPostResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferRatesPostResponse403> Forbidden
     */
    transfer_rates_post(body: types.TransferRatesPostBodyParam, metadata?: types.TransferRatesPostMetadataParam): Promise<FetchResponse<201, types.TransferRatesPostResponse201>>;
    /**
     * Retrieve a converted rate item using the returned unique identifier
     *
     * @summary Fetch converted rate
     * @throws FetchError<400, types.TransferRatesGetResponse400> Bad request
     * @throws FetchError<401, types.TransferRatesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.TransferRatesGetResponse403> Forbidden
     */
    transfer_rates_get(metadata: types.TransferRatesGetMetadataParam): Promise<FetchResponse<200, types.TransferRatesGetResponse200>>;
    /**
     * Get profile
     *
     * @summary Get profile
     * @throws FetchError<400, types.ProfileGetResponse400> Bad request
     * @throws FetchError<401, types.ProfileGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileGetResponse403> Forbidden
     * @throws FetchError<409, types.ProfileGetResponse409> Conflict
     */
    profile_get(metadata?: types.ProfileGetMetadataParam): Promise<FetchResponse<200, types.ProfileGetResponse200>>;
    /**
     * Perform an action on profile
     *
     * @summary Perform an action on profile
     * @throws FetchError<400, types.ProfileActionsPostResponse400> Bad request
     * @throws FetchError<401, types.ProfileActionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileActionsPostResponse403> Forbidden
     * @throws FetchError<409, types.ProfileActionsPostResponse409> Conflict
     */
    profile_actions_post(body: types.ProfileActionsPostBodyParam, metadata?: types.ProfileActionsPostMetadataParam): Promise<FetchResponse<200, types.ProfileActionsPostResponse200>>;
    /**
     * Perform an update action on credential
     *
     * @summary Perform an update action on credential
     * @throws FetchError<400, types.ProfileCredentialsActionsPutResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsActionsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsActionsPutResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsActionsPutResponse409> Conflict
     */
    profile_credentials_actions_put(body: types.ProfileCredentialsActionsPutBodyParam, metadata?: types.ProfileCredentialsActionsPutMetadataParam): Promise<FetchResponse<200, types.ProfileCredentialsActionsPutResponse200>>;
    /**
     * Get credential
     *
     * @summary Get credential
     * @throws FetchError<400, types.ProfileCredentialsGetResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsGetResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsGetResponse409> Conflict
     */
    profile_credentials_get(metadata?: types.ProfileCredentialsGetMetadataParam): Promise<FetchResponse<200, types.ProfileCredentialsGetResponse200>>;
    /**
     * Perform an action on credential
     *
     * @summary Perform an action on credential
     * @throws FetchError<400, types.ProfileCredentialsActionsPostResponse400> Bad request
     * @throws FetchError<401, types.ProfileCredentialsActionsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ProfileCredentialsActionsPostResponse403> Forbidden
     * @throws FetchError<409, types.ProfileCredentialsActionsPostResponse409> Conflict
     */
    profile_credentials_actions_post(body: types.ProfileCredentialsActionsPostBodyParam, metadata?: types.ProfileCredentialsActionsPostMetadataParam): Promise<FetchResponse<200, types.ProfileCredentialsActionsPostResponse200>>;
    /**
     * List webhook endpoints
     *
     * @throws FetchError<400, types.WebhookEndpointsListResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsListResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsListResponse403> Forbidden
     */
    webhook_endpoints_list(metadata?: types.WebhookEndpointsListMetadataParam): Promise<FetchResponse<200, types.WebhookEndpointsListResponse200>>;
    /**
     * Create a webhook endpoint
     *
     * @summary Create a webhook endpoint
     * @throws FetchError<400, types.WebhookEndpointsPostResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsPostResponse403> Forbidden
     * @throws FetchError<409, types.WebhookEndpointsPostResponse409> Conflict
     */
    webhook_endpoints_post(body: types.WebhookEndpointsPostBodyParam, metadata?: types.WebhookEndpointsPostMetadataParam): Promise<FetchResponse<200, types.WebhookEndpointsPostResponse200>>;
    /**
     * Update a webhook endpoint
     *
     * @summary Update a webhook endpoint
     * @throws FetchError<400, types.WebhookEndpointsPutResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsPutResponse403> Forbidden
     * @throws FetchError<409, types.WebhookEndpointsPutResponse409> Conflict
     */
    webhook_endpoints_put(body: types.WebhookEndpointsPutBodyParam, metadata: types.WebhookEndpointsPutMetadataParam): Promise<FetchResponse<200, types.WebhookEndpointsPutResponse200>>;
    /**
     * Delete a webhook endpoint
     *
     * @throws FetchError<400, types.WebhookEndpointsDeleteResponse400> Bad request
     * @throws FetchError<401, types.WebhookEndpointsDeleteResponse401> Unauthorised request
     * @throws FetchError<403, types.WebhookEndpointsDeleteResponse403> Forbidden
     */
    webhook_endpoints_delete(metadata: types.WebhookEndpointsDeleteMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Exchange token
     *
     * @summary Exchange token
     * @throws FetchError<400, types.IdentityTokenExchangeResponse400> Bad request
     * @throws FetchError<401, types.IdentityTokenExchangeResponse401> Unauthorised request
     * @throws FetchError<403, types.IdentityTokenExchangeResponse403> Forbidden
     * @throws FetchError<409, types.IdentityTokenExchangeResponse409> Conflict
     */
    identity_token_exchange(body: types.IdentityTokenExchangeBodyParam, metadata?: types.IdentityTokenExchangeMetadataParam): Promise<FetchResponse<200, types.IdentityTokenExchangeResponse200>>;
    /**
     * (Sandbox) Update a charge status
     *
     * @summary (Sandbox) Update a charge status
     * @throws FetchError<400, types.RedirectSessionsChargesPutResponse400> Bad request
     * @throws FetchError<401, types.RedirectSessionsChargesPutResponse401> Unauthorised request
     * @throws FetchError<403, types.RedirectSessionsChargesPutResponse403> Forbidden
     * @throws FetchError<409, types.RedirectSessionsChargesPutResponse409> Conflict
     */
    redirect_sessions_charges_put(body: types.RedirectSessionsChargesPutBodyParam, metadata?: types.RedirectSessionsChargesPutMetadataParam): Promise<FetchResponse<200, types.RedirectSessionsChargesPutResponse200>>;
    /**
     * List settlement
     *
     * @throws FetchError<400, types.SettlementListResponse400> Bad request
     * @throws FetchError<401, types.SettlementListResponse401> Unauthorised request
     * @throws FetchError<403, types.SettlementListResponse403> Forbidden
     */
    settlement_list(metadata?: types.SettlementListMetadataParam): Promise<FetchResponse<200, types.SettlementListResponse200>>;
    /**
     * Retrieve a settlement
     *
     * @summary Retrieve a settlement
     * @throws FetchError<400, types.SettlementGetResponse400> Bad request
     * @throws FetchError<401, types.SettlementGetResponse401> Unauthorised request
     * @throws FetchError<403, types.SettlementGetResponse403> Forbidden
     */
    settlement_get(metadata: types.SettlementGetMetadataParam): Promise<FetchResponse<200, types.SettlementGetResponse200>>;
    /**
     * List chargebacks
     *
     * @throws FetchError<400, types.ChargebacksListResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksListResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksListResponse403> Forbidden
     */
    chargebacks_list(metadata?: types.ChargebacksListMetadataParam): Promise<FetchResponse<200, types.ChargebacksListResponse200>>;
    /**
     * Create a chargeback
     *
     * @throws FetchError<400, types.ChargebacksPostResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksPostResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksPostResponse403> Forbidden
     */
    chargebacks_post(body: types.ChargebacksPostBodyParam, metadata?: types.ChargebacksPostMetadataParam): Promise<FetchResponse<201, types.ChargebacksPostResponse201>>;
    /**
     * get chargeback by id
     *
     * @throws FetchError<400, types.ChargebacksGetByIdResponse400> Bad request
     * @throws FetchError<401, types.ChargebacksGetByIdResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebacksGetByIdResponse403> Forbidden
     */
    chargebacks_get_by_id(metadata: types.ChargebacksGetByIdMetadataParam): Promise<FetchResponse<200, types.ChargebacksGetByIdResponse200>>;
    /**
     * Update a chargeback
     *
     * @summary Update a chargeback
     * @throws FetchError<400, types.ChargebackPutResponse400> Bad request
     * @throws FetchError<401, types.ChargebackPutResponse401> Unauthorised request
     * @throws FetchError<403, types.ChargebackPutResponse403> Forbidden
     */
    chargeback_put(body: types.ChargebackPutBodyParam, metadata: types.ChargebackPutMetadataParam): Promise<FetchResponse<200, types.ChargebackPutResponse200>>;
    /**
     * List refunds
     *
     * @throws FetchError<400, types.RefundsListResponse400> Bad request
     * @throws FetchError<401, types.RefundsListResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsListResponse403> Forbidden
     */
    refunds_list(metadata?: types.RefundsListMetadataParam): Promise<FetchResponse<200, types.RefundsListResponse200>>;
    /**
     * Create a refund
     *
     * @summary Create a refund
     * @throws FetchError<400, types.RefundsPostResponse400> Bad request
     * @throws FetchError<401, types.RefundsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsPostResponse403> Forbidden
     * @throws FetchError<409, types.RefundsPostResponse409> Conflict
     */
    refunds_post(body: types.RefundsPostBodyParam, metadata?: types.RefundsPostMetadataParam): Promise<FetchResponse<201, types.RefundsPostResponse201>>;
    /**
     * Retrieve a refund
     *
     * @throws FetchError<400, types.RefundsGetResponse400> Bad request
     * @throws FetchError<401, types.RefundsGetResponse401> Unauthorised request
     * @throws FetchError<403, types.RefundsGetResponse403> Forbidden
     */
    refunds_get(metadata: types.RefundsGetMetadataParam): Promise<FetchResponse<200, types.RefundsGetResponse200>>;
    /**
     * (Experience) Update a charge status with V2 webhook
     *
     * @summary (Experience) Update a charge status with V2 webhook
     */
    charges_v2_webhook_update_post(body: types.ChargesV2WebhookUpdatePostBodyParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieve transaction fees.
     *
     * @summary Retrieve fees
     * @throws FetchError<400, types.FeesGetResponse400> Bad request
     * @throws FetchError<401, types.FeesGetResponse401> Unauthorised request
     * @throws FetchError<403, types.FeesGetResponse403> Forbidden
     */
    fees_get(metadata: types.FeesGetMetadataParam): Promise<FetchResponse<200, types.FeesGetResponse200>>;
    /**
     * List orders
     *
     * @throws FetchError<400, types.OrdersListResponse400> Bad request
     * @throws FetchError<401, types.OrdersListResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersListResponse403> Forbidden
     */
    orders_list(metadata?: types.OrdersListMetadataParam): Promise<FetchResponse<200, types.OrdersListResponse200>>;
    /**
     * Create an order
     *
     * @summary Create an order
     * @throws FetchError<400, types.OrdersPostResponse400> Bad request
     * @throws FetchError<401, types.OrdersPostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersPostResponse403> Forbidden
     * @throws FetchError<409, types.OrdersPostResponse409> Conflict
     */
    orders_post(body: types.OrdersPostBodyParam, metadata?: types.OrdersPostMetadataParam): Promise<FetchResponse<201, types.OrdersPostResponse201>>;
    /**
     * Retrieve an order
     *
     * @summary Retrieve an order
     * @throws FetchError<400, types.OrdersGetResponse400> Bad request
     * @throws FetchError<401, types.OrdersGetResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersGetResponse403> Forbidden
     */
    orders_get(metadata: types.OrdersGetMetadataParam): Promise<FetchResponse<200, types.OrdersGetResponse200>>;
    /**
     * Update an order
     *
     * @summary Update an order
     * @throws FetchError<400, types.OrdersPutResponse400> Bad request
     * @throws FetchError<401, types.OrdersPutResponse401> Unauthorised request
     * @throws FetchError<403, types.OrdersPutResponse403> Forbidden
     */
    orders_put(body: types.OrdersPutBodyParam, metadata: types.OrdersPutMetadataParam): Promise<FetchResponse<200, types.OrdersPutResponse200>>;
    /**
     * Create an order with orchestator helper.
     *
     * @summary Initiate Order with Orchestrator.
     * @throws FetchError<400, types.OrchestrationDirectOrderPostResponse400> Bad request
     * @throws FetchError<401, types.OrchestrationDirectOrderPostResponse401> Unauthorised request
     * @throws FetchError<403, types.OrchestrationDirectOrderPostResponse403> Forbidden
     * @throws FetchError<409, types.OrchestrationDirectOrderPostResponse409> Conflict
     */
    orchestration_direct_order_post(body: types.OrchestrationDirectOrderPostBodyParam, metadata?: types.OrchestrationDirectOrderPostMetadataParam): Promise<FetchResponse<201, types.OrchestrationDirectOrderPostResponse201>>;
    /**
     * List all virtual accounts
     *
     * @throws FetchError<400, types.VirtualAccountsListResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsListResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsListResponse403> Forbidden
     */
    virtual_accounts_list(metadata?: types.VirtualAccountsListMetadataParam): Promise<FetchResponse<200, types.VirtualAccountsListResponse200>>;
    /**
     * Create a virtual account
     *
     * @summary Create a virtual account
     * @throws FetchError<400, types.VirtualAccountsPostResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsPostResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsPostResponse403> Forbidden
     * @throws FetchError<409, types.VirtualAccountsPostResponse409> Conflict
     */
    virtual_accounts_post(body: types.VirtualAccountsPostBodyParam, metadata?: types.VirtualAccountsPostMetadataParam): Promise<FetchResponse<201, types.VirtualAccountsPostResponse201>>;
    /**
     * Retrieve a virtual account
     *
     * @summary Retrieve a virtual account
     * @throws FetchError<400, types.VirtualAccountGetResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountGetResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountGetResponse403> Forbidden
     */
    virtual_account_get(metadata: types.VirtualAccountGetMetadataParam): Promise<FetchResponse<200, types.VirtualAccountGetResponse200>>;
    /**
     * Update a virtual account
     *
     * @summary Update a virtual account
     * @throws FetchError<400, types.VirtualAccountsPutResponse400> Bad request
     * @throws FetchError<401, types.VirtualAccountsPutResponse401> Unauthorised request
     * @throws FetchError<403, types.VirtualAccountsPutResponse403> Forbidden
     */
    virtual_accounts_put(body: types.VirtualAccountsPutBodyParam, metadata: types.VirtualAccountsPutMetadataParam): Promise<FetchResponse<200, types.VirtualAccountsPutResponse200>>;
    /**
     * (Experience) Update a refund status with V2 webhook
     *
     * @summary (Experience) Update a refund status with V2 webhook
     */
    refunds_v2_webhook_update_post(body: types.RefundsV2WebhookUpdatePostBodyParam): Promise<FetchResponse<number, unknown>>;
}
declare const createSDK: SDK;
export default createSDK;
