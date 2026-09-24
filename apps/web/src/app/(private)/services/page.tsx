import { redirect } from 'next/navigation';

import {
  getServiceList,
  type ServiceItem,
  type ServicePrice,
} from '../../../lib/api/service-management';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';
import {
  createServiceAction,
  setServiceActiveAction,
  updateServiceAction,
} from './actions';

interface ServicesPageProps {
  searchParams: Promise<{
    create?: string | string[];
    update?: string | string[];
    status?: string | string[];
    active?: string | string[];
  }>;
}

function currencyFractionDigits(currencyCode: string): number {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function priceAmount(price: ServicePrice | null): string {
  if (!price) {
    return '';
  }

  const fractionDigits = currencyFractionDigits(price.currencyCode);
  const divisor = 10 ** fractionDigits;

  return (price.minorUnits / divisor).toFixed(fractionDigits);
}

function priceLabel(price: ServicePrice | null): string {
  if (!price) {
    return 'No price configured';
  }

  const fractionDigits = currencyFractionDigits(price.currencyCode);
  const divisor = 10 ** fractionDigits;
  const amount = price.minorUnits / divisor;

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: price.currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${price.currencyCode} ${amount.toFixed(fractionDigits)}`;
  }
}

function mutationNotice(
  createStatus: string | null,
  updateStatus: string | null,
  serviceStatus: string | null,
  active: string | null,
): {
  tone: 'success' | 'error';
  message: string;
} | null {
  if (createStatus === 'success') {
    return {
      tone: 'success',
      message: 'Service created successfully.',
    };
  }

  if (createStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the service details before creating it.',
    };
  }

  if (updateStatus === 'success') {
    return {
      tone: 'success',
      message: 'Service updated successfully.',
    };
  }

  if (updateStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the service details before saving changes.',
    };
  }

  if (updateStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The service could not be found.',
    };
  }

  if (serviceStatus === 'success') {
    return {
      tone: 'success',
      message:
        active === 'true'
          ? 'Service activated successfully.'
          : 'Service deactivated successfully.',
    };
  }

  if (serviceStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'The requested service status is invalid.',
    };
  }

  if (serviceStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The service could not be found.',
    };
  }

  return null;
}

function ServiceEditForm({ service }: { service: ServiceItem }) {
  return (
    <details className="service-editor">
      <summary>Edit service</summary>

      <form action={updateServiceAction} className="service-form">
        <input type="hidden" name="serviceId" value={service.id} />

        <div className="service-form__grid">
          <label className="service-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              defaultValue={service.name}
              maxLength={160}
              required
            />
          </label>

          <label className="service-field">
            <span>Duration</span>
            <div className="service-field__suffix">
              <input
                type="number"
                name="durationMinutes"
                defaultValue={service.durationMinutes}
                min={1}
                step={1}
                required
              />
              <span>min</span>
            </div>
          </label>

          <label className="service-field">
            <span>Price</span>
            <input
              type="text"
              inputMode="decimal"
              name="priceAmount"
              defaultValue={priceAmount(service.price)}
              placeholder="Optional"
            />
          </label>

          <label className="service-field">
            <span>Currency</span>
            <input
              type="text"
              name="currencyCode"
              defaultValue={service.price?.currencyCode ?? 'COP'}
              minLength={3}
              maxLength={3}
              spellCheck={false}
            />
          </label>

          <label className="service-field service-field--wide">
            <span>Description</span>
            <textarea
              name="description"
              defaultValue={service.description ?? ''}
              rows={3}
              maxLength={1000}
              placeholder="Optional description"
            />
          </label>
        </div>

        <div className="service-form__footer">
          <p>Leaving the price empty removes the configured price.</p>

          <button type="submit">Save changes</button>
        </div>
      </form>
    </details>
  );
}

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let services: ServiceItem[];

  try {
    const response = await getServiceList(accessToken);
    services = response.items;
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const params = await searchParams;

  const createStatus = typeof params.create === 'string' ? params.create : null;

  const updateStatus = typeof params.update === 'string' ? params.update : null;

  const serviceStatus =
    typeof params.status === 'string' ? params.status : null;

  const active = typeof params.active === 'string' ? params.active : null;

  const notice = mutationNotice(
    createStatus,
    updateStatus,
    serviceStatus,
    active,
  );

  const activeServices = services.filter((service) => service.isActive).length;

  const pricedServices = services.filter(
    (service) => service.price !== null,
  ).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Business configuration</p>
          <h1>Services</h1>
          <p className="page-header__description">
            Configure what the business offers, how long each service takes and
            the price customers may be quoted.
          </p>
        </div>

        <span className="count-pill">
          {services.length} {services.length === 1 ? 'service' : 'services'}
        </span>
      </header>

      <section className="service-summary" aria-label="Service summary">
        <article className="service-summary__card">
          <span>Total services</span>
          <strong>{services.length}</strong>
        </article>

        <article className="service-summary__card">
          <span>Active</span>
          <strong>{activeServices}</strong>
        </article>

        <article className="service-summary__card">
          <span>Inactive</span>
          <strong>{services.length - activeServices}</strong>
        </article>

        <article className="service-summary__card">
          <span>With price</span>
          <strong>{pricedServices}</strong>
        </article>
      </section>

      {notice ? (
        <p
          className={`service-notice service-notice--${notice.tone}`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      <section
        className="service-management-panel"
        aria-labelledby="service-create-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 id="service-create-heading">Create service</h2>
          </div>

          <p>Price is optional. Duration is required for scheduling.</p>
        </div>

        <form action={createServiceAction} className="service-form">
          <div className="service-form__grid">
            <label className="service-field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                maxLength={160}
                placeholder="Dental evaluation"
                required
              />
            </label>

            <label className="service-field">
              <span>Duration</span>

              <div className="service-field__suffix">
                <input
                  type="number"
                  name="durationMinutes"
                  min={1}
                  step={1}
                  placeholder="30"
                  required
                />
                <span>min</span>
              </div>
            </label>

            <label className="service-field">
              <span>Price</span>
              <input
                type="text"
                inputMode="decimal"
                name="priceAmount"
                placeholder="120000"
              />
            </label>

            <label className="service-field">
              <span>Currency</span>
              <input
                type="text"
                name="currencyCode"
                defaultValue="COP"
                minLength={3}
                maxLength={3}
                spellCheck={false}
              />
            </label>

            <label className="service-field service-field--wide">
              <span>Description</span>
              <textarea
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="Optional description"
              />
            </label>
          </div>

          <div className="service-form__footer">
            <p>
              New services start active and can immediately participate in
              scheduling configuration.
            </p>

            <button type="submit">Create service</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="service-list-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Configured services</p>
            <h2 id="service-list-heading">Service catalog</h2>
          </div>

          <p>
            Inactive services remain stored but are unavailable for new
            scheduling.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__mark" aria-hidden="true">
              S
            </div>

            <div>
              <h2>No services yet</h2>
              <p>
                Create the first service to begin configuring staff and
                availability.
              </p>
            </div>
          </div>
        ) : (
          <div className="service-catalog">
            {services.map((service) => (
              <article
                className={`service-card${
                  service.isActive ? '' : ' service-card--inactive'
                }`}
                key={service.id}
              >
                <div className="service-card__header">
                  <div>
                    <div className="service-card__title">
                      <h3>{service.name}</h3>

                      <span
                        className={`service-state ${
                          service.isActive
                            ? 'service-state--active'
                            : 'service-state--inactive'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p>{service.description ?? 'No description configured.'}</p>
                  </div>

                  <div className="service-card__price">
                    <strong>{priceLabel(service.price)}</strong>
                    <span>{service.durationMinutes} min</span>
                  </div>
                </div>

                <ServiceEditForm service={service} />

                <div className="service-card__footer">
                  <span>
                    Updated{' '}
                    <time dateTime={service.updatedAt}>
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                      }).format(new Date(service.updatedAt))}
                    </time>
                  </span>

                  <form action={setServiceActiveAction}>
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={service.isActive ? 'false' : 'true'}
                    />

                    <button
                      className={
                        service.isActive
                          ? 'service-status-action service-status-action--deactivate'
                          : 'service-status-action'
                      }
                      type="submit"
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
