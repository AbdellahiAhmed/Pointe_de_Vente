import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../../app-common/components/input/button";
import { DEBT_MANAGEMENT } from "../../routes/frontend.routes";

export const DebtManagementButton: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      variant="warning"
      size="lg"
      onClick={() => navigate(DEBT_MANAGEMENT)}
      title={t("Debt Management")}
      type="button"
      tabIndex={-1}
    >
      {t("Debt Management")}
    </Button>
  );
};
