import React, {FC, useState} from "react";
import {Controller, useForm} from "react-hook-form";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {SETUP_ACTIVATE} from "../../../api/routing/routes/backend.app";
import {useNavigate} from "react-router";
import {HttpException} from "../../../lib/http/exception/http.exception";

interface SetupProps {
  loginRoute: string;
}

export const Setup: FC<SetupProps> = ({loginRoute}) => {
  const {t} = useTranslation();
  const {handleSubmit, control} = useForm();
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  const onSubmit = async (values: any) => {
    setLoading(true);
    setErrorMessage(undefined);

    try {
      const res = await jsonRequest(SETUP_ACTIVATE, {
        method: 'POST',
        body: JSON.stringify({
          activationCode: values.activationCode,
          storeName: values.storeName,
          terminalCode: values.terminalCode,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.violations?.[0]?.message || json?.message || t('Invalid activation code');
        setErrorMessage(msg);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = loginRoute;
      }, 1500);
    } catch (err: any) {
      if (err instanceof HttpException) {
        try {
          const body = await err.response.json();
          setErrorMessage(body?.violations?.[0]?.message || body?.message || t('Invalid activation code'));
        } catch {
          setErrorMessage(t('Invalid activation code'));
        }
      } else {
        setErrorMessage(t('An error occurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="justify-center items-center h-screen flex flex-row login-bg">
      <div className="card w-96 flex flex-col justify-center">
        <div className="card-body">
          <div className="pt-4 pb-2">
            <h5 className="card-title text-center pb-0 fs-4">
              {t("System Setup")}
            </h5>
            <p className="text-center text-sm text-gray-500 mt-2">
              {t("Enter the activation code to initialize the system")}
            </p>
          </div>

          {success && (
            <div className="alert mb-3 bg-success-100 text-success-700 p-3 rounded">
              {t("System activated successfully")}
            </div>
          )}

          {errorMessage && (
            <div className="alert alert-danger mb-3 bg-danger-100 p-3 rounded">
              {errorMessage}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <div>
                <label htmlFor="activationCode" className="form-label">
                  {t("Activation Code")}
                </label>
                <Controller
                  name="activationCode"
                  render={(props) => (
                    <input
                      onChange={props.field.onChange}
                      value={props.field.value}
                      type="password"
                      id="activationCode"
                      className="input w-full"
                      autoFocus
                      placeholder={t("Activation Code")}
                    />
                  )}
                  control={control}
                  defaultValue=""
                />
              </div>
              <div>
                <label htmlFor="storeName" className="form-label">
                  {t("Store Name")}
                </label>
                <Controller
                  name="storeName"
                  render={(props) => (
                    <input
                      onChange={props.field.onChange}
                      value={props.field.value}
                      type="text"
                      id="storeName"
                      className="input w-full"
                      placeholder={t("e.g. My Store")}
                    />
                  )}
                  control={control}
                  defaultValue=""
                  rules={{required: true}}
                />
              </div>
              <div>
                <label htmlFor="terminalCode" className="form-label">
                  {t("Terminal Code")}
                </label>
                <Controller
                  name="terminalCode"
                  render={(props) => (
                    <input
                      onChange={props.field.onChange}
                      value={props.field.value}
                      type="text"
                      id="terminalCode"
                      className="input w-full"
                      placeholder={t("e.g. T1")}
                    />
                  )}
                  control={control}
                  defaultValue=""
                  rules={{required: true}}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary">
                  {isLoading ? t("Activating...") : t("Activate")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
