<?php

namespace App\Controller\Api\Admin;

use App\Factory\Controller\ApiResponseFactory;
use App\Security\Voter\UserManagementVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/admin/audit", name="admin_audit_")
 */
class AuditController extends AbstractController
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * @Route("/log", methods={"GET"}, name="log")
     */
    public function log(
        Request $request,
        ApiResponseFactory $responseFactory
    ): Response {
        $this->denyAccessUnlessGranted(UserManagementVoter::MANAGE);

        $objectClass = $request->query->get('entity');
        $action = $request->query->get('action');
        $username = $request->query->get('username');
        $dateFrom = $request->query->get('dateFrom');
        $dateTo = $request->query->get('dateTo');
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, max(10, $request->query->getInt('limit', 50)));

        $conn = $this->em->getConnection();

        $where = ['1=1'];
        $params = [];

        if ($objectClass) {
            $where[] = 'e.object_class LIKE :objectClass';
            $params['objectClass'] = '%' . $objectClass . '%';
        }
        if ($action) {
            $where[] = 'e.action = :action';
            $params['action'] = $action;
        }
        if ($username) {
            $where[] = 'e.username LIKE :username';
            $params['username'] = '%' . $username . '%';
        }
        if ($dateFrom) {
            $where[] = 'e.logged_at >= :dateFrom';
            $params['dateFrom'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $where[] = 'e.logged_at <= :dateTo';
            $params['dateTo'] = $dateTo . ' 23:59:59';
        }

        $whereClause = implode(' AND ', $where);

        // Count
        $countSql = "SELECT COUNT(*) FROM ext_log_entries e WHERE {$whereClause}";
        $total = (int) $conn->fetchOne($countSql, $params);

        // Fetch
        $offset = ($page - 1) * $limit;
        $sql = "SELECT e.id, e.action, e.logged_at, e.object_id, e.object_class, e.version, e.data, e.username
                FROM ext_log_entries e
                WHERE {$whereClause}
                ORDER BY e.logged_at DESC
                LIMIT {$limit} OFFSET {$offset}";

        $rows = $conn->fetchAllAssociative($sql, $params);

        $entityLabels = [
            'Product' => 'Product',
            'Order' => 'Order',
            'Customer' => 'Customer',
            'User' => 'User',
            'Store' => 'Store',
            'Category' => 'Category',
            'Payment' => 'Payment',
            'Discount' => 'Discount',
            'Tax' => 'Tax',
            'Expense' => 'Expense',
        ];

        $data = array_map(function ($row) use ($entityLabels) {
            $classParts = explode('\\', $row['object_class']);
            $shortClass = end($classParts);

            $decoded = null;
            if ($row['data']) {
                $decoded = @unserialize($row['data']);
                if ($decoded === false) {
                    $decoded = @json_decode($row['data'], true);
                }
            }

            return [
                'id' => (int) $row['id'],
                'action' => $row['action'],
                'loggedAt' => $row['logged_at'],
                'objectId' => $row['object_id'],
                'objectClass' => $shortClass,
                'objectClassFull' => $row['object_class'],
                'version' => (int) $row['version'],
                'data' => $decoded,
                'username' => $row['username'],
            ];
        }, $rows);

        return $responseFactory->json([
            'list' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => (int) ceil($total / $limit),
        ]);
    }
}
