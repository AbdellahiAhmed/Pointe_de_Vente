import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { PRODUCT_DOWNLOAD } from "../../../../api/routing/routes/backend.app";
import { request } from "../../../../api/request/request";

export const ExportItems = () => {
  const {t} = useTranslation();
  const onClick = async () => {
    const response = await request(PRODUCT_DOWNLOAD);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button type="button" variant="primary" onClick={onClick}>
        <FontAwesomeIcon icon={faDownload} className="me-2" /> {t("Export items")}
      </Button>
    </>
  );
};
