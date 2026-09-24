import { redirect } from 'next/navigation';

import {
  getServiceList,
  type ServiceItem,
} from '../../../lib/api/service-management';
import {
  getStaffList,
  type StaffMemberItem,
} from '../../../lib/api/staff-management';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';
import {
  createStaffMemberAction,
  setStaffMemberActiveAction,
  updateStaffMemberAction,
} from './actions';

interface StaffPageProps {
  searchParams: Promise<{
    create?: string | string[];
    update?: string | string[];
    status?: string | string[];
    active?: string | string[];
  }>;
}

function mutationNotice(
  createStatus: string | null,
  updateStatus: string | null,
  staffStatus: string | null,
  active: string | null,
): {
  tone: 'success' | 'error';
  message: string;
} | null {
  if (createStatus === 'success') {
    return {
      tone: 'success',
      message: 'Staff member created successfully.',
    };
  }

  if (createStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the staff member details before creating it.',
    };
  }

  if (createStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'One or more selected services could not be found.',
    };
  }

  if (updateStatus === 'success') {
    return {
      tone: 'success',
      message: 'Staff member updated successfully.',
    };
  }

  if (updateStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the staff member details before saving changes.',
    };
  }

  if (updateStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The staff member or a selected service could not be found.',
    };
  }

  if (staffStatus === 'success') {
    return {
      tone: 'success',
      message:
        active === 'true'
          ? 'Staff member activated successfully.'
          : 'Staff member deactivated successfully.',
    };
  }

  if (staffStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'The requested staff member status is invalid.',
    };
  }

  if (staffStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The staff member could not be found.',
    };
  }

  return null;
}

function ServiceAssignments({
  services,
  assignedServiceIds = new Set<string>(),
}: {
  services: ServiceItem[];
  assignedServiceIds?: Set<string>;
}) {
  if (services.length === 0) {
    return (
      <p className="staff-service-options__empty">
        No services are configured yet. You can create the staff member now and
        assign services later.
      </p>
    );
  }

  return (
    <div className="staff-service-options">
      {services.map((service) => (
        <label className="staff-service-option" key={service.id}>
          <input
            type="checkbox"
            name="serviceIds"
            value={service.id}
            defaultChecked={assignedServiceIds.has(service.id)}
          />

          <span className="staff-service-option__content">
            <strong>{service.name}</strong>
            <small>
              {service.durationMinutes} min
              {!service.isActive ? ' · Inactive service' : ''}
            </small>
          </span>
        </label>
      ))}
    </div>
  );
}

function StaffEditForm({
  staffMember,
  services,
}: {
  staffMember: StaffMemberItem;
  services: ServiceItem[];
}) {
  const assignedServiceIds = new Set(
    staffMember.services.map((service) => service.id),
  );

  return (
    <details className="service-editor">
      <summary>Edit staff member</summary>

      <form action={updateStaffMemberAction} className="service-form">
        <input type="hidden" name="staffMemberId" value={staffMember.id} />

        <div className="staff-form__grid">
          <label className="service-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              defaultValue={staffMember.name}
              maxLength={160}
              required
            />
          </label>

          <fieldset className="staff-service-fieldset">
            <legend>Assigned services</legend>

            <ServiceAssignments
              services={services}
              assignedServiceIds={assignedServiceIds}
            />
          </fieldset>
        </div>

        <div className="service-form__footer">
          <p>
            Service assignments are replaced with the selections saved here.
          </p>

          <button type="submit">Save changes</button>
        </div>
      </form>
    </details>
  );
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let staffMembers: StaffMemberItem[];
  let services: ServiceItem[];

  try {
    const [staffResponse, serviceResponse] = await Promise.all([
      getStaffList(accessToken),
      getServiceList(accessToken),
    ]);

    staffMembers = staffResponse.items;
    services = serviceResponse.items;
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const params = await searchParams;

  const createStatus = typeof params.create === 'string' ? params.create : null;

  const updateStatus = typeof params.update === 'string' ? params.update : null;

  const staffStatus = typeof params.status === 'string' ? params.status : null;

  const active = typeof params.active === 'string' ? params.active : null;

  const notice = mutationNotice(
    createStatus,
    updateStatus,
    staffStatus,
    active,
  );

  const activeStaff = staffMembers.filter(
    (staffMember) => staffMember.isActive,
  ).length;

  const assignedStaff = staffMembers.filter(
    (staffMember) => staffMember.services.length > 0,
  ).length;

  const totalAssignments = staffMembers.reduce(
    (total, staffMember) => total + staffMember.services.length,
    0,
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Business configuration</p>
          <h1>Staff</h1>
          <p className="page-header__description">
            Manage the people who provide services and control which services
            each staff member can perform.
          </p>
        </div>

        <span className="count-pill">
          {staffMembers.length}{' '}
          {staffMembers.length === 1 ? 'staff member' : 'staff members'}
        </span>
      </header>

      <section className="service-summary" aria-label="Staff summary">
        <article className="service-summary__card">
          <span>Total staff</span>
          <strong>{staffMembers.length}</strong>
        </article>

        <article className="service-summary__card">
          <span>Active</span>
          <strong>{activeStaff}</strong>
        </article>

        <article className="service-summary__card">
          <span>Inactive</span>
          <strong>{staffMembers.length - activeStaff}</strong>
        </article>

        <article className="service-summary__card">
          <span>Assignments</span>
          <strong>{totalAssignments}</strong>
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
        aria-labelledby="staff-create-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2 id="staff-create-heading">Create staff member</h2>
          </div>

          <p>
            Assign one or more services now, or leave them unassigned until
            later.
          </p>
        </div>

        <form action={createStaffMemberAction} className="service-form">
          <div className="staff-form__grid">
            <label className="service-field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                maxLength={160}
                placeholder="Dr. Andrea López"
                required
              />
            </label>

            <fieldset className="staff-service-fieldset">
              <legend>Services</legend>
              <ServiceAssignments services={services} />
            </fieldset>
          </div>

          <div className="service-form__footer">
            <p>
              New staff members start active. Scheduling also requires
              availability rules, which we configure in the next block.
            </p>

            <button type="submit">Create staff member</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="staff-list-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Configured staff</p>
            <h2 id="staff-list-heading">Team roster</h2>
          </div>

          <p>
            {assignedStaff} of {staffMembers.length} staff members currently
            have at least one service assigned.
          </p>
        </div>

        {staffMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__mark" aria-hidden="true">
              T
            </div>

            <div>
              <h2>No staff yet</h2>
              <p>
                Create the first staff member and assign the services they can
                provide.
              </p>
            </div>
          </div>
        ) : (
          <div className="service-catalog">
            {staffMembers.map((staffMember) => (
              <article
                className={`service-card${
                  staffMember.isActive ? '' : ' service-card--inactive'
                }`}
                key={staffMember.id}
              >
                <div className="service-card__header">
                  <div>
                    <div className="service-card__title">
                      <h3>{staffMember.name}</h3>

                      <span
                        className={`service-state ${
                          staffMember.isActive
                            ? 'service-state--active'
                            : 'service-state--inactive'
                        }`}
                      >
                        {staffMember.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p>
                      {staffMember.services.length === 0
                        ? 'No services assigned yet.'
                        : `${staffMember.services.length} ${
                            staffMember.services.length === 1
                              ? 'service'
                              : 'services'
                          } assigned.`}
                    </p>
                  </div>

                  <div className="staff-card__metric">
                    <strong>{staffMember.services.length}</strong>
                    <span>assignments</span>
                  </div>
                </div>

                <div
                  className="staff-assignment-list"
                  aria-label={`Services assigned to ${staffMember.name}`}
                >
                  {staffMember.services.length === 0 ? (
                    <span className="staff-assignment-empty">Unassigned</span>
                  ) : (
                    staffMember.services.map((service) => (
                      <span
                        className={`staff-assignment-pill${
                          service.isActive
                            ? ''
                            : ' staff-assignment-pill--inactive'
                        }`}
                        key={service.id}
                      >
                        {service.name}
                        {!service.isActive ? ' · inactive' : ''}
                      </span>
                    ))
                  )}
                </div>

                <StaffEditForm staffMember={staffMember} services={services} />

                <div className="service-card__footer">
                  <span>
                    Updated{' '}
                    <time dateTime={staffMember.updatedAt}>
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                      }).format(new Date(staffMember.updatedAt))}
                    </time>
                  </span>

                  <form action={setStaffMemberActiveAction}>
                    <input
                      type="hidden"
                      name="staffMemberId"
                      value={staffMember.id}
                    />
                    <input
                      type="hidden"
                      name="isActive"
                      value={staffMember.isActive ? 'false' : 'true'}
                    />

                    <button
                      className={
                        staffMember.isActive
                          ? 'service-status-action service-status-action--deactivate'
                          : 'service-status-action'
                      }
                      type="submit"
                    >
                      {staffMember.isActive ? 'Deactivate' : 'Activate'}
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
